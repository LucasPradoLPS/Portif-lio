// Teste da API GitHub
console.log('🔍 Testando API GitHub...');

async function testGitHubAPI() {
    try {
        const response = await fetch('https://api.github.com/users/LucasPradoLPS/repos?sort=updated&per_page=10', {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Portfolio-Website'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const repos = await response.json();
        console.log(`✅ Sucesso! Encontrados ${repos.length} repositórios`);
        console.log('📋 Repositórios:', repos.map(r => r.name));
        
        // Filtrar apenas repos não-fork
        const filteredRepos = repos.filter(repo => !repo.fork && !repo.archived);
        console.log(`🔍 Após filtro: ${filteredRepos.length} repositórios válidos`);
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao testar API:', error);
        return false;
    }
}

// Executar teste
testGitHubAPI();