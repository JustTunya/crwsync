import 'reflect-metadata';
import { AppDataSource } from './data-source';

(async () => {
  try {
    const ds = await AppDataSource.initialize();
    await ds.runMigrations();
    await ds.destroy();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();