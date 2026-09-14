export type SupportedLocale = "en" | "es";

export type TranslationDictionary = {
  common: {
    appName: string;
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    close: string;
    confirm: string;
    back: string;
    next: string;
    skipToContent: string;
    actions: string;
    status: string;
    error: string;
    success: string;
    retry: string;
  };
  nav: {
    home: string;
    dashboard: string;
    features: string;
    architecture: string;
    about: string;
    contact: string;
    terms: string;
    privacy: string;
    signin: string;
    signup: string;
    settings: string;
    logout: string;
  };
  auth: {
    signinTitle: string;
    signupTitle: string;
    emailLabel: string;
    passwordLabel: string;
    forgotPassword: string;
    resetPassword: string;
    verifyEmailTitle: string;
  };
  dashboard: {
    workspaces: string;
    createWorkspace: string;
    modules: string;
    projects: string;
    activity: string;
    members: string;
  };
  kanban: {
    boardTitle: string;
    addTask: string;
    addColumn: string;
    filterTasks: string;
    taskDetails: string;
    comments: string;
    checklist: string;
    attachments: string;
  };
  chat: {
    placeholder: string;
    send: string;
    typingSingle: string;
    typingMultiple: string;
    onlineMembers: string;
  };
  settings: {
    profileTitle: string;
    workspaceSettings: string;
    dangerZone: string;
    deleteAccount: string;
    exportData: string;
  };
  a11y: {
    openMenu: string;
    closeMenu: string;
    toggleTheme: string;
    notifications: string;
    searchWorkspace: string;
    taskMoved: string;
    newMessage: string;
  };
};

export type NestedKeyOf<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}.${NestedKeyOf<T[K]>}`
    : `${K}`;
}[keyof T & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationDictionary>;
