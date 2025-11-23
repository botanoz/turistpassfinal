import { 
    HelpCircle, 
    CreditCard, 
    Clock, 
    Ticket, 
    Users 
  } from "lucide-react";
  
  export interface FAQQuestion {
    question: string;
    answer: string;
  }
  
  export interface FAQCategory {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    questions: FAQQuestion[];
  }
  
  export const faqData: FAQCategory[] = [
    {
      id: "general",
      label: "General",
      icon: HelpCircle,
      questions: [
        {
          question: "How do I use my Pass?",
          answer: "Simply show the QR code sent to you for your purchased pass at venue entrances. Your QR code is stored digitally and can be used throughout its entire validity period."
        },
        {
          question: "What should I do if I lose my Pass?",
          answer: "Your Pass QR code is stored digitally. You can always access your QR code by logging into your account. If you experience any issues, our 24/7 customer service will assist you."
        },
        {
          question: "Can I transfer my Pass to someone else?",
          answer: "Passes are personal and non-transferable. Each pass can only be used by one person. For security reasons, you cannot transfer your pass to another person."
        }
      ]
    },
    {
      id: "payment",
      label: "Payment",
      icon: CreditCard,
      questions: [
        {
          question: "Can I pay in installments when purchasing a Pass?",
          answer: "Yes, we offer 3, 6, and 9 installment options for partnered credit cards. You can view the installment options on the payment page."
        },
        {
          question: "Can I cancel my Pass?",
          answer: "You can return your Pass within 24 hours before first use. Returns are not possible after first use. Please contact our customer service for refund requests."
        }
      ]
    },
    {
      id: "usage",
      label: "Usage",
      icon: Clock,
      questions: [
        {
          question: "How long is my Pass valid?",
          answer: "Your Pass is valid for the duration you selected (24, 48, or 72 hours) from first use. Once the period begins, it continues uninterrupted."
        },
        {
          question: "Can I visit the same venue multiple times?",
          answer: "Yes, you can visit the same venue as many times as you want during your pass validity period. There are no limitations on the number of visits."
        },
        {
          question: "Is entry to all venues free?",
          answer: "Yes, entry to all venues covered by the pass is free. Extra services (special events, VIP areas, food and beverages) may be subject to additional charges."
        }
      ]
    },
    {
      id: "special",
      label: "Special",
      icon: Ticket,
      questions: [
        {
          question: "Is there a special pass for children?",
          answer: "Yes, there is a 50% discounted child pass available for children aged 6-12. Children under 6 years can enter free with their pass-holding parents."
        },
        {
          question: "Can I attend special events with my Pass?",
          answer: "Premium and VIP pass holders have priority access to special events. You can follow our event calendar on our website or mobile app."
        }
      ]
    }
  ];