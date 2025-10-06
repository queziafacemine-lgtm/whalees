const { initializeDatabase } = require('../database/database');

async function runMigrations() {
  console.log('🔄 Executando migrações...');

  try {
    const db = await initializeDatabase();
    console.log('✅ Migrações executadas com sucesso!');
    console.log('🎉 Banco de dados configurado com sucesso!');
    
    // Fechar conexão
    await db.close();
  } catch (error) {
    console.error('❌ Erro ao executar migrações:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na configuração do banco:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };