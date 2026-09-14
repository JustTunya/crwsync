import type { TranslationDictionary } from "../types";

export const en: TranslationDictionary = {
  common: {
    appName: "crwsync",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    search: "Search",
    close: "Close",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    skipToContent: "Skip to main content",
    actions: "Actions",
    status: "Status",
    error: "An error occurred",
    success: "Success",
    retry: "Retry"
  },
  nav: {
    home: "Home",
    dashboard: "Dashboard",
    features: "Features",
    architecture: "Architecture",
    about: "About",
    contact: "Contact",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    signin: "Sign In",
    signup: "Sign Up",
    settings: "Settings",
    logout: "Log Out"
  },
  auth: {
    signinTitle: "Sign in to your account",
    signupTitle: "Create your crwsync account",
    emailLabel: "Email address",
    passwordLabel: "Password",
    forgotPassword: "Forgot password?",
    resetPassword: "Reset password",
    verifyEmailTitle: "Verify your email"
  },
  dashboard: {
    workspaces: "Workspaces",
    createWorkspace: "Create Workspace",
    modules: "Modules",
    projects: "Projects",
    activity: "Activity",
    members: "Members"
  },
  kanban: {
    boardTitle: "Kanban Board",
    addTask: "Add task",
    addColumn: "Add column",
    filterTasks: "Filter tasks",
    taskDetails: "Task details",
    comments: "Comments",
    checklist: "Checklist",
    attachments: "Attachments"
  },
  chat: {
    placeholder: "Type a message...",
    send: "Send message",
    typingSingle: "{user} is typing...",
    typingMultiple: "{users} are typing...",
    onlineMembers: "Online members"
  },
  settings: {
    profileTitle: "Profile Settings",
    workspaceSettings: "Workspace Settings",
    dangerZone: "Danger Zone",
    deleteAccount: "Delete Account",
    exportData: "Export Account Data"
  },
  a11y: {
    openMenu: "Open menu",
    closeMenu: "Close menu",
    toggleTheme: "Toggle theme",
    notifications: "Notifications",
    searchWorkspace: "Search workspace (Ctrl+K)",
    taskMoved: "Task {title} moved to {column}",
    newMessage: "New message from {user}"
  }
};
