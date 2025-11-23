import { createClient } from '@/lib/supabase/client';

export interface Message {
  id: string;
  type: 'notification' | 'offer' | 'alert' | 'success';
  title: string;
  content: string;
  date: string;
  read: boolean;
  pass_id?: string;
  order_id?: string;
}

export interface MessageTemplate {
  id: string;
  key: string;
  name: string;
  type: 'notification' | 'offer' | 'alert' | 'success';
  title_template: string;
  content_template: string;
  enabled: boolean;
  description?: string;
  variables: string[];
}

/**
 * Fetch all messages for the current user
 * Falls back to mock data if database fails
 */
export async function getUserMessages(): Promise<Message[]> {
  const supabase = createClient();

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('No authenticated user, returning mock messages');
      return getMockMessages();
    }

    // Fetch messages from database
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    if (!messages || messages.length === 0) {
      return [];
    }

    // Transform to frontend format
    return messages.map(msg => ({
      id: msg.id,
      type: msg.type,
      title: msg.title,
      content: msg.content,
      date: msg.created_at,
      read: msg.read,
      pass_id: msg.pass_id,
      order_id: msg.order_id
    }));

  } catch (error) {
    console.error('Error in getUserMessages:', error);
    return [];
  }
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(messageId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markMessageAsRead:', error);
    return false;
  }
}

/**
 * Create a new message for a user
 * (Admin function - requires admin privileges)
 */
export async function createMessage(data: {
  customer_id: string;
  type: Message['type'];
  title: string;
  content: string;
  pass_id?: string;
  order_id?: string;
}): Promise<{ success: boolean; message?: Message; error?: string }> {
  const supabase = createClient();

  try {
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        customer_id: data.customer_id,
        type: data.type,
        title: data.title,
        content: data.content,
        pass_id: data.pass_id || null,
        order_id: data.order_id || null,
        read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: {
        id: message.id,
        type: message.type,
        title: message.title,
        content: message.content,
        date: message.created_at,
        read: message.read,
        pass_id: message.pass_id,
        order_id: message.order_id
      }
    };
  } catch (error: any) {
    console.error('Error in createMessage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send message from template
 * Replaces variables in template with provided values
 */
export async function sendMessageFromTemplate(
  customerId: string,
  templateKey: string,
  variables: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('key', templateKey)
      .eq('enabled', true)
      .single();

    if (templateError || !template) {
      return { success: false, error: 'Template not found or disabled' };
    }

    // Replace variables in title and content
    let title = template.title_template;
    let content = template.content_template;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), value);
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });

    // Create message
    const result = await createMessage({
      customer_id: customerId,
      type: template.type,
      title,
      content
    });

    return result.success
      ? { success: true }
      : { success: false, error: result.error };

  } catch (error: any) {
    console.error('Error in sendMessageFromTemplate:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all message templates (admin function)
 */
export async function getMessageTemplates(): Promise<MessageTemplate[]> {
  const supabase = createClient();

  try {
    const { data: templates, error } = await supabase
      .from('message_templates')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    return templates.map(t => ({
      id: t.id,
      key: t.key,
      name: t.name,
      type: t.type,
      title_template: t.title_template,
      content_template: t.content_template,
      enabled: t.enabled,
      description: t.description,
      variables: t.variables || []
    }));

  } catch (error) {
    console.error('Error in getMessageTemplates:', error);
    return [];
  }
}

/**
 * Mock messages for fallback
 */
function getMockMessages(): Message[] {
  return [
    {
      id: "1",
      type: "success",
      title: "Pass Activated Successfully",
      content: "Your Istanbul Welcome Pass is now active and ready to use at all partner locations.",
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      read: false
    },
    {
      id: "2",
      type: "offer",
      title: "Special Offer: 25% Off Food Pass",
      content: "Upgrade to our Food & Beverage Pass and get 25% off. Limited time offer!",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: false
    },
    {
      id: "3",
      type: "notification",
      title: "New Partner Added",
      content: "Check out our newest partner: Galata Tower. Now accepting TuristPass!",
      date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: "4",
      type: "alert",
      title: "Pass Expiring Soon",
      content: "Your Food & Beverage Pass will expire on June 30, 2025. Renew now to continue enjoying benefits.",
      date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      read: true
    }
  ];
}
