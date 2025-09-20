// Script para limpar projetos salvos e recarregar do GitHub
console.log('🧹 Limpando cache de projetos...');

// Limpar localStorage
localStorage.removeItem('portfolioProjects');

// Recarregar a página para buscar novos dados
console.log('🔄 Recarregando dados do GitHub...');
window.location.reload();