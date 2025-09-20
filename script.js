// Configuração global
const CONFIG = {
    animationSpeed: 300,
    scrollOffset: 80
};

// Array para armazenar projetos
let projects = [];

// GitHub Configuration
const GITHUB_CONFIG = {
    username: 'LucasPradoLPS',
    apiUrl: 'https://api.github.com/users/LucasPradoLPS/repos',
    maxRepos: 10, // Máximo de repositórios para exibir
    excludedRepos: ['ana'] // Lista de repositórios para excluir (em lowercase)
    // Para excluir mais repositórios, adicione o nome em lowercase: ['ana', 'repo2', 'repo3']
};

// DOM Elements
let elements = {};

// Função utilitária para formatar datas
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1d';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}m`;
    return `${Math.floor(diffDays / 365)}a`;
}

function formatFileSize(sizeKB) {
    if (sizeKB < 1024) {
        return `${sizeKB} KB`;
    } else {
        const sizeMB = (sizeKB / 1024).toFixed(1);
        return `${sizeMB} MB`;
    }
}

// Função para limpar projetos antigos do GitHub que podem estar no localStorage
function clearOldGitHubProjects() {
    const savedProjects = loadProjectsFromStorage();
    if (savedProjects.length > 0) {
        // Filtrar apenas projetos que não são do GitHub ou que não estão na lista de excluídos
        const cleanedProjects = savedProjects.filter(project => {
            if (project.isGitHubRepo) {
                // Se é projeto do GitHub, verificar se não está na lista de excluídos
                return !GITHUB_CONFIG.excludedRepos.includes(project.title.toLowerCase()) &&
                       !GITHUB_CONFIG.excludedRepos.includes(project.github?.split('/').pop()?.toLowerCase() || '');
            }
            // Se não é projeto do GitHub, manter
            return true;
        });
        
        // Se houve mudança, salvar a lista limpa
        if (cleanedProjects.length !== savedProjects.length) {
            console.log(`🧹 Removendo ${savedProjects.length - cleanedProjects.length} projetos excluídos do cache`);
            projects = cleanedProjects;
            saveProjectsToStorage();
        }
    }
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se há parâmetro de limpeza na URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('clearCache') === 'true') {
        console.log('🧹 Parâmetro clearCache detectado - limpando tudo');
        localStorage.clear();
        // Remover o parâmetro da URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    initializeElements();
    initializeEventListeners();
    initializeAnimations();
    initializeSkillBars();
    clearOldGitHubProjects(); // Limpar projetos antigos do GitHub
    loadSampleProjects();
    loadGitHubProjects();
    updatePortfolioStats();
    updateActiveNavLink();
    initializeTheme();
    // initializeTypingEffect(); // Removido - cursor de digitação desabilitado
});

// Inicializar elementos do DOM
function initializeElements() {
    elements = {
        hamburger: document.querySelector('.hamburger'),
        navMenu: document.querySelector('.nav-menu'),
        navLinks: document.querySelectorAll('.nav-link'),
        filterBtns: document.querySelectorAll('.filter-btn'),
        portfolioGrid: document.getElementById('portfolioGrid'),
        addProjectBtn: document.getElementById('addProjectBtn'),
        syncGitHubBtn: document.getElementById('syncGitHubBtn'),
        projectModal: document.getElementById('projectModal'),
        projectForm: document.getElementById('projectForm'),
        closeModal: document.querySelector('.close'),
        contactForm: document.querySelector('.contact-form'),
        skillCards: document.querySelectorAll('.skill-card'),
        fadeElements: document.querySelectorAll('.fade-in'),
        themeToggle: document.getElementById('themeToggle')
    };
}

// Inicializar event listeners
function initializeEventListeners() {
    // Mobile menu toggle
    elements.hamburger?.addEventListener('click', toggleMobileMenu);

    // Navigation links
    elements.navLinks.forEach(link => {
        link.addEventListener('click', handleNavClick);
    });

    // Portfolio filters
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });

    // Modal events
    elements.addProjectBtn?.addEventListener('click', openProjectModal);
    elements.syncGitHubBtn?.addEventListener('click', handleGitHubSync);
    elements.closeModal?.addEventListener('click', closeProjectModal);
    elements.projectModal?.addEventListener('click', handleModalOutsideClick);
    elements.projectForm?.addEventListener('submit', handleProjectSubmit);

    // Contact form
    elements.contactForm?.addEventListener('submit', handleContactSubmit);

    // Theme toggle
    elements.themeToggle?.addEventListener('click', toggleTheme);

    // Scroll events
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
}

// Mobile Menu Functions
function toggleMobileMenu() {
    elements.hamburger.classList.toggle('active');
    elements.navMenu.classList.toggle('active');
}

function closeMobileMenu() {
    elements.hamburger.classList.remove('active');
    elements.navMenu.classList.remove('active');
}

// Navigation Functions
function handleNavClick(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    
    if (targetElement) {
        const offsetTop = targetElement.offsetTop - CONFIG.scrollOffset;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
    
    closeMobileMenu();
    updateActiveNavLink();
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section');
    const scrollPos = window.scrollY + CONFIG.scrollOffset + 100;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            elements.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

// Portfolio Filter Functions
function handleFilterClick(e) {
    const filter = e.target.getAttribute('data-filter');
    
    // Update active filter button
    elements.filterBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // Filter portfolio items
    filterPortfolioItems(filter);
}

function filterPortfolioItems(filter) {
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    portfolioItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        
        if (filter === 'all' || filter === itemCategory) {
            item.classList.remove('hide');
            setTimeout(() => {
                item.style.display = 'block';
            }, 10);
        } else {
            item.classList.add('hide');
            setTimeout(() => {
                if (item.classList.contains('hide')) {
                    item.style.display = 'none';
                }
            }, CONFIG.animationSpeed);
        }
    });
}

// Modal Functions
function openProjectModal() {
    elements.projectModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeProjectModal() {
    elements.projectModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    elements.projectForm.reset();
}

function handleModalOutsideClick(e) {
    if (e.target === elements.projectModal) {
        closeProjectModal();
    }
}

// Project Management Functions
function handleProjectSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const projectData = {
        id: Date.now(),
        title: document.getElementById('projectTitle').value,
        description: document.getElementById('projectDescription').value,
        category: document.getElementById('projectCategory').value,
        image: document.getElementById('projectImage').value,
        link: document.getElementById('projectLink').value,
        github: document.getElementById('projectGithub').value
    };
    
    addProject(projectData);
    closeProjectModal();
    
    // Show success message
    showNotification('Projeto adicionado com sucesso!', 'success');
}

function addProject(projectData) {
    projects.push(projectData);
    renderProject(projectData);
    saveProjectsToStorage();
}

function renderProject(project) {
    // Badge do GitHub com informações melhoradas
    const githubBadge = project.isGitHubRepo ? `
        <div class="github-badge">
            <i class="fab fa-github"></i>
            ${project.language ? `<span class="language language-${project.language.toLowerCase()}">${project.language}</span>` : ''}
            ${project.stars >= 0 ? `<span class="stars"><i class="fas fa-star"></i> ${project.stars}</span>` : ''}
        </div>
    ` : '';
    
    // Informações adicionais para repositórios do GitHub
    const githubInfo = project.isGitHubRepo ? `
        <div class="github-repo-info">
            ${project.forks >= 0 ? `<span class="github-stat forks"><i class="fas fa-code-branch"></i> ${project.forks}</span>` : ''}
            ${project.openIssues >= 0 ? `<span class="github-stat issues"><i class="fas fa-exclamation-circle"></i> ${project.openIssues}</span>` : ''}
            ${project.watchers > 0 ? `<span class="github-stat watchers"><i class="fas fa-eye"></i> ${project.watchers}</span>` : ''}
            ${project.license ? `<span class="github-stat license"><i class="fas fa-certificate"></i> ${project.license}</span>` : ''}
            ${project.size > 0 ? `<span class="github-stat size"><i class="fas fa-hdd"></i> ${formatFileSize(project.size)}</span>` : ''}
            ${project.updatedAt ? `<span class="github-stat updated"><i class="fas fa-clock"></i> ${formatDate(project.updatedAt)}</span>` : ''}
        </div>
        ${project.topics && project.topics.length > 0 ? `
            <div class="github-topics">
                ${project.topics.slice(0, 3).map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
                ${project.topics.length > 3 ? `<span class="topic-tag more">+${project.topics.length - 3}</span>` : ''}
            </div>
        ` : ''}
    ` : '';
    
    // Atributos especiais para repositórios do GitHub
    const githubAttributes = project.isGitHubRepo ? `data-github="true" data-language="${(project.language || 'default').toLowerCase()}"` : '';
    const popularClass = (project.isGitHubRepo && project.stars >= 10) ? ' popular-repo' : '';
    
    // Badge para repositórios populares
    const popularBadge = (project.isGitHubRepo && project.stars >= 10) ? `
        <div class="popular-badge">
            <i class="fas fa-fire"></i> Popular
        </div>
    ` : '';
    
    // Badge de atividade baseado na data de atualização
    const getActivityBadge = (updatedAt) => {
        if (!updatedAt) return '';
        const now = new Date();
        const updated = new Date(updatedAt);
        const daysDiff = (now - updated) / (1000 * 60 * 60 * 24);
        
        if (daysDiff <= 7) return `<div class="activity-badge recent"><i class="fas fa-clock"></i> Recente</div>`;
        if (daysDiff <= 30) return `<div class="activity-badge active"><i class="fas fa-code"></i> Ativo</div>`;
        if (daysDiff <= 90) return `<div class="activity-badge stable"><i class="fas fa-check"></i> Estável</div>`;
        return '';
    };
    
    const activityBadge = project.isGitHubRepo ? getActivityBadge(project.updatedAt) : '';
    
    // Badge de tipo de projeto
    const projectTypeBadge = project.isGitHubRepo && project.projectType ? `
        <div class="project-type-badge ${project.projectType}">
            ${getProjectTypeIcon(project.projectType)} ${getProjectTypeLabel(project.projectType)}
        </div>
    ` : '';
    
    const projectHTML = `
        <div class="portfolio-item${popularClass}" data-category="${project.category}" data-id="${project.id}" ${githubAttributes}>
            ${githubBadge}
            ${popularBadge}
            ${activityBadge}
            ${projectTypeBadge}
            ${!project.isGitHubRepo ? `<img src="${project.image}" alt="${project.title}" class="portfolio-img" loading="lazy">` : ''}
            ${githubInfo}
            <div class="portfolio-content">
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                <div class="portfolio-links">
                    ${project.isGitHubRepo ? `
                        <a href="${project.github}" target="_blank" class="portfolio-link">
                            <i class="fab fa-github"></i> Código
                        </a>
                        ${project.link !== project.github ? `
                            <a href="${project.link}" target="_blank" class="portfolio-link">
                                <i class="fas fa-external-link-alt"></i> Demo
                            </a>
                        ` : ''}
                    ` : `
                        <a href="${project.link}" target="_blank" class="portfolio-link">
                            <i class="fas fa-external-link-alt"></i> Ver Projeto
                        </a>
                        ${project.github ? `
                            <a href="${project.github}" target="_blank" class="portfolio-link">
                                <i class="fab fa-github"></i> GitHub
                            </a>
                        ` : ''}
                        <button onclick="removeProject(${project.id})" class="portfolio-link" style="background: linear-gradient(135deg, #dc3545, #c82333); color: white;">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
    
    elements.portfolioGrid.insertAdjacentHTML('beforeend', projectHTML);
    
    // Animate new project
    const newProject = elements.portfolioGrid.lastElementChild;
    newProject.style.opacity = '0';
    newProject.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        newProject.style.transition = 'all 0.5s ease';
        newProject.style.opacity = '1';
        newProject.style.transform = 'translateY(0)';
    }, 100);
}

function removeProject(projectId) {
    if (confirm('Tem certeza que deseja remover este projeto?')) {
        projects = projects.filter(project => project.id !== projectId);
        const projectElement = document.querySelector(`[data-id="${projectId}"]`);
        
        if (projectElement) {
            projectElement.style.transition = 'all 0.3s ease';
            projectElement.style.opacity = '0';
            projectElement.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                projectElement.remove();
            }, CONFIG.animationSpeed);
        }
        
        saveProjectsToStorage();
        showNotification('Projeto removido com sucesso!', 'info');
    }
}

function loadSampleProjects() {
    // Verificar se já existem projetos salvos
    const savedProjects = loadProjectsFromStorage();
    if (savedProjects.length > 0) {
        projects = savedProjects;
        projects.forEach(project => renderProject(project));
        return;
    }
    
    const sampleProjects = [
        {
            id: 1,
            title: "E-commerce Moderno",
            description: "Plataforma de e-commerce completa com React e Node.js, incluindo sistema de pagamentos e dashboard administrativo.",
            category: "web",
            image: "https://via.placeholder.com/400x250/667eea/ffffff?text=E-commerce",
            link: "https://example.com",
            github: "https://github.com/example/ecommerce"
        },
        {
            id: 2,
            title: "App Mobile Fitness",
            description: "Aplicativo mobile para acompanhamento de exercícios e nutrição, desenvolvido com React Native e Firebase.",
            category: "mobile",
            image: "https://via.placeholder.com/400x250/764ba2/ffffff?text=Fitness+App",
            link: "https://example.com",
            github: "https://github.com/example/fitness-app"
        },
        {
            id: 3,
            title: "Dashboard Analytics",
            description: "Dashboard interativo para análise de dados com gráficos dinâmicos e relatórios em tempo real.",
            category: "web",
            image: "https://via.placeholder.com/400x250/f093fb/ffffff?text=Dashboard",
            link: "https://example.com",
            github: "https://github.com/example/dashboard"
        },
        {
            id: 4,
            title: "Design System",
            description: "Sistema de design completo com componentes reutilizáveis e guia de estilo para aplicações web.",
            category: "design",
            image: "https://via.placeholder.com/400x250/45b7d1/ffffff?text=Design+System",
            link: "https://example.com",
            github: ""
        }
    ];
    
    projects = [...sampleProjects];
    sampleProjects.forEach(project => renderProject(project));
    saveProjectsToStorage();
}

// Local Storage Functions
function saveProjectsToStorage() {
    localStorage.setItem('portfolioProjects', JSON.stringify(projects));
}

function loadProjectsFromStorage() {
    const savedProjects = localStorage.getItem('portfolioProjects');
    return savedProjects ? JSON.parse(savedProjects) : [];
}

// Contact Form Functions
function handleContactSubmit(e) {
    e.preventDefault();
    
    // Simular envio de mensagem
    showNotification('Mensagem enviada com sucesso! Retornarei em breve.', 'success');
    e.target.reset();
}

// Animation Functions
function initializeAnimations() {
    // Intersection Observer para animações
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observar elementos com animação
    document.querySelectorAll('.fade-in, .skill-card, .portfolio-item, .about-stats, .contact-item').forEach(el => {
        observer.observe(el);
    });
}

function initializeSkillBars() {
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const skillProgress = entry.target.querySelector('.skill-progress');
                const width = skillProgress.getAttribute('data-width');
                
                setTimeout(() => {
                    skillProgress.style.setProperty('--skill-width', width);
                    skillProgress.style.width = width;
                }, 200);
                
                skillObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    elements.skillCards.forEach(card => {
        skillObserver.observe(card);
    });
}

// Scroll Functions
function handleScroll() {
    updateActiveNavLink();
    updateHeaderBackground();
}

function updateHeaderBackground() {
    const header = document.querySelector('.header');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    if (window.scrollY > 50) {
        header.style.background = isDark ? 'rgba(30, 30, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)';
    } else {
        header.style.background = isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    }
}

// Utility Functions
function handleResize() {
    // Fechar menu mobile ao redimensionar
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
}

function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Adicionar estilos inline
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease;
        max-width: 350px;
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Evento de fechar
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => removeNotification(notification));
    
    // Auto remover após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            removeNotification(notification);
        }
    }, 5000);
}

function removeNotification(notification) {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100px)';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, CONFIG.animationSpeed);
}

// Smooth scrolling para navegadores que não suportam CSS scroll-behavior
function smoothScrollTo(targetPosition, duration = 800) {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(animation);
}

// Função para adicionar mais interatividade aos projetos
function addProjectInteractivity() {
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    portfolioItems.forEach(item => {
        const img = item.querySelector('.portfolio-img');
        
        item.addEventListener('mouseenter', () => {
            img.style.transform = 'scale(1.05)';
        });
        
        item.addEventListener('mouseleave', () => {
            img.style.transform = 'scale(1)';
        });
    });
}

// Função para validar URLs
function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Função para lazy loading de imagens
function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Função para typing effect no título
function initializeTypingEffect() {
    const title = document.querySelector('.home-title');
    if (title) {
        const originalText = title.innerHTML;
        const textOnly = title.textContent;
        
        // Adicionar cursor animado
        title.innerHTML = '<span class="typing-cursor">|</span>';
        
        let i = 0;
        let isTag = false;
        let tag = '';
        
        function typeWriter() {
            if (i < originalText.length) {
                const char = originalText.charAt(i);
                
                if (char === '<') {
                    isTag = true;
                }
                
                if (isTag) {
                    tag += char;
                    if (char === '>') {
                        isTag = false;
                        title.innerHTML = title.innerHTML.replace('<span class="typing-cursor">|</span>', tag + '<span class="typing-cursor">|</span>');
                        tag = '';
                    }
                } else {
                    title.innerHTML = title.innerHTML.replace('<span class="typing-cursor">|</span>', char + '<span class="typing-cursor">|</span>');
                }
                
                i++;
                setTimeout(typeWriter, isTag ? 0 : 80);
            } else {
                // Remover cursor após terminar
                setTimeout(() => {
                    title.innerHTML = title.innerHTML.replace('<span class="typing-cursor">|</span>', '');
                }, 1500);
            }
        }
        
        // Iniciar typing effect após um delay
        setTimeout(typeWriter, 1500);
    }
}

// Função para particles background (opcional)
function createParticlesBackground() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0.1';
    
    const homeSection = document.querySelector('.home');
    if (homeSection) {
        homeSection.appendChild(canvas);
    }
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const particles = [];
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 3 + 1
        });
    }
    
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();
        });
        
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
}

// Inicializar efeitos adicionais
setTimeout(() => {
    initializeLazyLoading();
    addProjectInteractivity();
    // createParticlesBackground(); // Descomente se quiser o efeito de partículas
}, 1000);

// Theme Functions
function initializeTheme() {
    // Verificar se há preferência salva
    const savedTheme = localStorage.getItem('portfolioTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Definir tema inicial
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    // Aplicar tema imediatamente para evitar flash
    if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }
    
    setTheme(initialTheme);
    
    // Escutar mudanças na preferência do sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('portfolioTheme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Salvar preferência
    localStorage.setItem('portfolioTheme', newTheme);
    
    // Animação premium do botão
    const button = elements.themeToggle;
    button.style.animation = 'themeSwitch 0.4s ease-in-out';
    setTimeout(() => {
        button.style.animation = '';
    }, 400);
}

function setTheme(theme) {
    const htmlElement = document.documentElement;
    const lightIcon = elements.themeToggle?.querySelector('.theme-icon-light');
    const darkIcon = elements.themeToggle?.querySelector('.theme-icon-dark');
    
    if (theme === 'dark') {
        htmlElement.classList.add('dark');
        htmlElement.setAttribute('data-theme', 'dark');
        
        // Animar troca de ícones
        if (lightIcon && darkIcon) {
            lightIcon.style.opacity = '0';
            lightIcon.style.transform = 'rotate(180deg) scale(0.8)';
            darkIcon.style.opacity = '1';
            darkIcon.style.transform = 'rotate(0deg) scale(1)';
        }
        
        elements.themeToggle?.setAttribute('aria-label', 'Alternar para modo claro');
    } else {
        htmlElement.classList.remove('dark');
        htmlElement.setAttribute('data-theme', 'light');
        
        // Animar troca de ícones
        if (lightIcon && darkIcon) {
            lightIcon.style.opacity = '1';
            lightIcon.style.transform = 'rotate(0deg) scale(1)';
            darkIcon.style.opacity = '0';
            darkIcon.style.transform = 'rotate(-180deg) scale(0.8)';
        }
        
        elements.themeToggle?.setAttribute('aria-label', 'Alternar para modo escuro');
    }
    
    // Atualizar meta theme-color para mobile
    updateThemeColor(theme);
}

function updateThemeColor(theme) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
    }
    
    const themeColors = {
        light: '#ffffff',
        dark: '#0f172a'
    };
    
    metaThemeColor.setAttribute('content', themeColors[theme]);
}

// Função para detectar preferência de tema do sistema
function getSystemThemePreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// GitHub API Functions
async function fetchGitHubRepos() {
    try {
        showLoadingState(true);
        
        const response = await fetch(GITHUB_CONFIG.apiUrl + '?sort=updated&per_page=50&type=public', {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Portfolio-Website'
            }
        });
        
        if (!response.ok) {
            console.error(`GitHub API Error: ${response.status} - ${response.statusText}`);
            throw new Error(`GitHub API Error: ${response.status}`);
        }
        
        const repos = await response.json();
        
        console.log(`Total de repositórios encontrados: ${repos.length}`);
        
        // Contar repositórios por tipo
        const publicRepos = repos.filter(repo => !repo.private);
        const privateRepos = repos.filter(repo => repo.private);
        const excludedRepos = repos.filter(repo => 
            GITHUB_CONFIG.excludedRepos.includes(repo.name.toLowerCase())
        );
        console.log(`📊 Repositórios públicos: ${publicRepos.length}, privados: ${privateRepos.length}`);
        if (excludedRepos.length > 0) {
            console.log(`🚫 Repositórios excluídos: ${excludedRepos.map(r => r.name).join(', ')}`);
        }
        
        // Filtrar repositórios relevantes (apenas públicos)
        const filteredRepos = repos
            .filter(repo => 
                !repo.fork && // Não é fork
                !repo.archived && // Não está arquivado
                !repo.private && // Apenas repositórios públicos
                !GITHUB_CONFIG.excludedRepos.includes(repo.name.toLowerCase()) && // Excluir repositórios da lista
                (repo.description || repo.name) // Tem descrição OU nome válido
            )
            .slice(0, GITHUB_CONFIG.maxRepos)
            .map(repo => ({
                id: `github-${repo.id}`,
                title: repo.name.replace(/-/g, ' ').replace(/_/g, ' ').toLowerCase()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' '),
                description: repo.description || `Projeto ${repo.language ? `em ${repo.language}` : 'de desenvolvimento'} disponível no GitHub`,
                category: detectCategory(repo),
                link: repo.homepage || repo.html_url,
                github: repo.html_url,
                language: repo.language,
                stars: repo.stargazers_count || 0,
                forks: repo.forks_count || 0,
                openIssues: repo.open_issues_count || 0,
                updatedAt: repo.updated_at,
                createdAt: repo.created_at,
                // Informações técnicas avançadas
                size: repo.size || 0,
                license: repo.license?.name || null,
                topics: repo.topics || [],
                defaultBranch: repo.default_branch,
                hasIssues: repo.has_issues,
                hasWiki: repo.has_wiki,
                hasPages: repo.has_pages,
                visibility: repo.visibility,
                watchers: repo.watchers_count || 0,
                // Classificação do projeto
                projectType: detectProjectType(repo),
                isGitHubRepo: true
            }));
        
        console.log(`🔍 Repositórios públicos filtrados: ${filteredRepos.length}`);
        console.log('📋 Repositórios selecionados:', filteredRepos.map(r => `${r.title} (${r.language || 'N/A'})`));
        
        return filteredRepos;
        
    } catch (error) {
        console.error('Erro ao buscar repositórios do GitHub:', error);
        showNotification('Erro ao carregar projetos do GitHub. Tentando novamente...', 'error');
        return [];
    } finally {
        showLoadingState(false);
    }
}

function detectCategory(repo) {
    const name = repo.name.toLowerCase();
    const description = (repo.description || '').toLowerCase();
    const language = (repo.language || '').toLowerCase();
    
    // Detectar categoria baseada em palavras-chave
    if (name.includes('mobile') || name.includes('app') || language.includes('java') || language.includes('kotlin') || language.includes('swift')) {
        return 'mobile';
    }
    
    if (name.includes('design') || name.includes('ui') || name.includes('ux') || description.includes('design')) {
        return 'design';
    }
    
    // Por padrão, considerar como web
    return 'web';
}

function detectProjectType(repo) {
    const name = repo.name.toLowerCase();
    const description = (repo.description || '').toLowerCase();
    const topics = (repo.topics || []).join(' ').toLowerCase();
    const content = `${name} ${description} ${topics}`;
    
    // Website/Portfolio
    if (content.includes('portfolio') || content.includes('website') || 
        content.includes('landing') || repo.has_pages) {
        return 'website';
    }
    
    // API/Backend
    if (content.includes('api') || content.includes('backend') || 
        content.includes('server') || content.includes('rest')) {
        return 'api';
    }
    
    // Library/Framework
    if (content.includes('library') || content.includes('framework') || 
        content.includes('package') || content.includes('npm') ||
        content.includes('component')) {
        return 'library';
    }
    
    // Tool/Utility
    if (content.includes('tool') || content.includes('utility') || 
        content.includes('cli') || content.includes('script')) {
        return 'tool';
    }
    
    // Game
    if (content.includes('game') || content.includes('gaming') || 
        content.includes('unity') || content.includes('phaser')) {
        return 'game';
    }
    
    // Bot
    if (content.includes('bot') || content.includes('discord') || 
        content.includes('telegram') || content.includes('chatbot')) {
        return 'bot';
    }
    
    return 'app';
}

function getProjectTypeIcon(type) {
    const icons = {
        'website': '<i class="fas fa-globe"></i>',
        'api': '<i class="fas fa-server"></i>',
        'library': '<i class="fas fa-book"></i>',
        'tool': '<i class="fas fa-tools"></i>',
        'game': '<i class="fas fa-gamepad"></i>',
        'bot': '<i class="fas fa-robot"></i>',
        'app': '<i class="fas fa-mobile-alt"></i>'
    };
    return icons[type] || '<i class="fas fa-code"></i>';
}

function getProjectTypeLabel(type) {
    const labels = {
        'website': 'Website',
        'api': 'API',
        'library': 'Library',
        'tool': 'Tool',
        'game': 'Game',
        'bot': 'Bot',
        'app': 'App'
    };
    return labels[type] || 'Projeto';
}

async function loadGitHubProjects() {
    const githubRepos = await fetchGitHubRepos();
    
    if (githubRepos.length > 0) {
        // Adicionar projetos do GitHub aos projetos existentes
        githubRepos.forEach(repo => {
            // Verificar se o projeto já não existe
            const existingProject = projects.find(p => p.github === repo.github);
            if (!existingProject) {
                projects.push(repo);
                renderProject(repo);
            }
        });
        
        saveProjectsToStorage();
        updatePortfolioStats();
        showNotification(`${githubRepos.length} repositórios públicos carregados do GitHub!`, 'success');
    }
}

function updatePortfolioStats() {
    const totalProjects = projects.length;
    const technologies = [...new Set(projects.map(p => p.language).filter(Boolean))];
    const totalStars = projects.reduce((sum, p) => sum + (p.stars || 0), 0);
    
    // Atualizar elementos da DOM se existirem
    const totalProjectsEl = document.getElementById('totalProjects');
    const totalTechnologiesEl = document.getElementById('totalTechnologies');
    const totalStarsEl = document.getElementById('totalStars');
    
    if (totalProjectsEl) totalProjectsEl.textContent = totalProjects;
    if (totalTechnologiesEl) totalTechnologiesEl.textContent = technologies.length;
    if (totalStarsEl) totalStarsEl.textContent = totalStars;
}

async function handleGitHubSync() {
    console.log('🔄 Iniciando sincronização do GitHub...');
    
    // Remover projetos existentes do GitHub do DOM e do array
    const githubProjects = projects.filter(p => p.isGitHubRepo);
    console.log(`🗑️ Removendo ${githubProjects.length} projetos do GitHub existentes`);
    
    githubProjects.forEach(project => {
        const projectElement = document.querySelector(`[data-id="${project.id}"]`);
        if (projectElement) {
            projectElement.remove();
        }
    });
    
    // Remover do array
    projects = projects.filter(p => !p.isGitHubRepo);
    
    // Também remover qualquer elemento que possa ter o nome "ana" (backup de segurança)
    const anaElements = document.querySelectorAll('.portfolio-item');
    anaElements.forEach(element => {
        const title = element.querySelector('h3')?.textContent?.toLowerCase();
        if (title && GITHUB_CONFIG.excludedRepos.some(excluded => title.includes(excluded))) {
            console.log(`🚫 Removendo elemento excluído: ${title}`);
            element.remove();
        }
    });
    
    // Carregar novamente
    await loadGitHubProjects();
    
    showNotification('Repositórios públicos sincronizados!', 'success');
}

function showLoadingState(isLoading) {
    const portfolioGrid = elements.portfolioGrid;
    const addProjectBtn = elements.addProjectBtn;
    
    if (isLoading) {
        // Mostrar loading
        if (!document.querySelector('.loading-indicator')) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-indicator';
            loadingDiv.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Carregando projetos do GitHub...</p>
            `;
            portfolioGrid.appendChild(loadingDiv);
        }
        
        if (addProjectBtn) addProjectBtn.disabled = true;
    } else {
        // Remover loading
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        
        if (addProjectBtn) addProjectBtn.disabled = false;
    }
}

// Exportar funções globais para uso no HTML
window.removeProject = removeProject;
window.toggleTheme = toggleTheme;
window.loadGitHubProjects = loadGitHubProjects;