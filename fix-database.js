const { initializeDatabase } = require('./database/database');

async function fixDatabase() {
  try {
    console.log('🔄 Inicializando banco de dados...');
    await initializeDatabase();
    console.log('✅ Banco de dados inicializado com sucesso!');
    console.log('🚀 Agora você pode iniciar o servidor normalmente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    process.exit(1);
  }
}

fixDatabase();