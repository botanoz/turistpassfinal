import { User } from "../types/user";

const MOCK_USERS: User[] = [
  {
    id: "1",
    email: "demo@turistpass.com",
    password: "Demo123!",
    firstName: "John",
    lastName: "Traveler",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    joinedDate: "2024-01-15",
    passes: [
      { id: "p1", name: "Istanbul Welcome Pass", expiryDate: "2025-12-31", status: "active" },
      { id: "p2", name: "Food & Beverage Pass", expiryDate: "2025-06-30", status: "active" }
    ],
    favorites: ["hagia-sophia", "topkapi-palace", "grand-bazaar"],
    totalSavings: 1250.50
  }
];

const STORAGE_KEY = "turistpass_current_user";
const SESSION_KEY = "turistpass_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000;

interface SessionData {
  userId: string;
  expiresAt: number;
}

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.initSession();
      this.setupSessionMonitoring();
    }
  }

  private initSession(): void {
    const sessionData = sessionStorage.getItem(SESSION_KEY);

    if (!sessionData) {
      this.clearSession();
      return;
    }

    try {
      const session: SessionData = JSON.parse(sessionData);

      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      this.clearSession();
    }
  }

  private setupSessionMonitoring(): void {
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY && !e.newValue) {
        this.currentUser = null;
        sessionStorage.removeItem(SESSION_KEY);
      }
    });

    window.addEventListener("beforeunload", () => {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (sessionData) {
        sessionStorage.setItem(SESSION_KEY, sessionData);
      }
    });
  }

  private createSession(userId: string): void {
    const session: SessionData = {
      userId,
      expiresAt: Date.now() + SESSION_DURATION
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  private clearSession(): void {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = MOCK_USERS.find(u => u.email === email && u.password === password);

    if (user) {
      const userWithoutPassword = { ...user };
      delete (userWithoutPassword as any).password;

      this.currentUser = userWithoutPassword;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithoutPassword));
        this.createSession(user.id);
      }

      return { success: true, user: userWithoutPassword };
    }

    return { success: false, error: "Invalid email or password" };
  }

  async signup(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const existingUser = MOCK_USERS.find(u => u.email === email);
    if (existingUser) {
      return { success: false, error: "Email already registered" };
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      password,
      firstName,
      lastName,
      avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
      joinedDate: new Date().toISOString().split('T')[0],
      passes: [],
      favorites: [],
      totalSavings: 0
    };

    MOCK_USERS.push(newUser);

    const userWithoutPassword = { ...newUser };
    delete (userWithoutPassword as any).password;

    this.currentUser = userWithoutPassword;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithoutPassword));
      this.createSession(newUser.id);
    }

    return { success: true, user: userWithoutPassword };
  }

  logout(): void {
    if (typeof window !== "undefined") {
      this.clearSession();
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;

    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (!sessionData) return false;

    try {
      const session: SessionData = JSON.parse(sessionData);
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return false;
      }
    } catch (e) {
      this.clearSession();
      return false;
    }

    return this.currentUser !== null;
  }

  async updateProfile(updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!this.currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    this.currentUser = { ...this.currentUser, ...updates };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentUser));
    }

    return { success: true, user: this.currentUser };
  }
}

export const authService = new AuthService();
