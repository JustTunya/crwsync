import type { TranslationDictionary } from "../types";

export const es: TranslationDictionary = {
  common: {
    appName: "crwsync",
    loading: "Cargando...",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    create: "Crear",
    search: "Buscar",
    close: "Cerrar",
    confirm: "Confirmar",
    back: "Atrás",
    next: "Siguiente",
    skipToContent: "Saltar al contenido principal",
    actions: "Acciones",
    status: "Estado",
    error: "Ocurrió un error",
    success: "Éxito",
    retry: "Reintentar"
  },
  nav: {
    home: "Inicio",
    dashboard: "Panel",
    features: "Características",
    architecture: "Arquitectura",
    about: "Acerca de",
    contact: "Contacto",
    terms: "Términos de servicio",
    privacy: "Política de privacidad",
    signin: "Iniciar sesión",
    signup: "Registrarse",
    settings: "Configuración",
    logout: "Cerrar sesión"
  },
  auth: {
    signinTitle: "Inicia sesión en tu cuenta",
    signupTitle: "Crea tu cuenta de crwsync",
    emailLabel: "Correo electrónico",
    passwordLabel: "Contraseña",
    forgotPassword: "¿Olvidaste tu contraseña?",
    resetPassword: "Restablecer contraseña",
    verifyEmailTitle: "Verifica tu correo"
  },
  dashboard: {
    workspaces: "Espacios de trabajo",
    createWorkspace: "Crear espacio",
    modules: "Módulos",
    projects: "Proyectos",
    activity: "Actividad",
    members: "Miembros"
  },
  kanban: {
    boardTitle: "Tablero Kanban",
    addTask: "Añadir tarea",
    addColumn: "Añadir columna",
    filterTasks: "Filtrar tareas",
    taskDetails: "Detalles de la tarea",
    comments: "Comentarios",
    checklist: "Lista de verificación",
    attachments: "Archivos adjuntos"
  },
  chat: {
    placeholder: "Escribe un mensaje...",
    send: "Enviar mensaje",
    typingSingle: "{user} está escribiendo...",
    typingMultiple: "{users} están escribiendo...",
    onlineMembers: "Miembros en línea"
  },
  settings: {
    profileTitle: "Configuración de perfil",
    workspaceSettings: "Configuración del espacio",
    dangerZone: "Zona de peligro",
    deleteAccount: "Eliminar cuenta",
    exportData: "Exportar datos de cuenta"
  },
  a11y: {
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    toggleTheme: "Alternar tema",
    notifications: "Notificaciones",
    searchWorkspace: "Buscar en espacio (Ctrl+K)",
    taskMoved: "Tarea {title} movida a {column}",
    newMessage: "Nuevo mensaje de {user}"
  }
};
