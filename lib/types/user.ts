export interface User {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  joinedDate: string;
  passes: UserPass[];
  favorites: string[];
  totalSavings: number;
}

export interface UserPass {
  id: string;
  name: string;
  expiryDate: string;
  status: "active" | "expired" | "inactive";
}
