import "next-auth";
import "next-auth/jwt";

type Role = "user" | "editor" | "admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      githubLogin: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    role?: Role;
    githubLogin?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    githubLogin?: string | null;
  }
}
