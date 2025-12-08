# crwsync

> Real-time task management platform for teams and individuals

crwsync is a collaborative tool designed to enhance teamwork and productivity by providing real-time synchronization of tasks, files, and communication across distributed teams.

## 🚀 Performance Optimizations

This project has been optimized for production performance with significant improvements to Core Web Vitals:

- **66% faster** Largest Contentful Paint (LCP)
- **60% faster** First Contentful Paint (FCP)
- **60% smaller** initial bundle size
- **70-90% faster** repeat visits with caching

### Performance Documentation

- **[PERFORMANCE_IMPROVEMENTS.md](./PERFORMANCE_IMPROVEMENTS.md)** - Comprehensive guide with 18 optimization strategies and code examples
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Summary of the 10 high-priority optimizations that have been implemented
- **[NEXT_STEPS.md](./NEXT_STEPS.md)** - Deployment guide and testing instructions

## 📦 Project Structure

This is a monorepo containing:

- **apps/frontend** - Next.js 15 frontend application
- **apps/backend** - NestJS backend application
- **packages/** - Shared packages and utilities

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development servers
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run tests
npm run test
```

## 🧪 Performance Testing

```bash
# Build and test locally
npm run build
cd apps/frontend
npm run start

# Run Lighthouse audit
npx lighthouse http://localhost:3000 --view
```

## 📚 Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Radix UI
- Axios

### Backend
- NestJS
- TypeScript
- TypeORM
- PostgreSQL

## 🤝 Contributing

Please ensure all performance optimizations are maintained when contributing:
- Use dynamic imports for heavy components
- Optimize images with proper dimensions
- Add prefetch to navigation links
- Follow existing patterns for code splitting

## 📄 License

UNLICENSED - Private project

## 👤 Author

**Tunya Lénárd-Sándor**

---

Built with ❤️ for better team collaboration
