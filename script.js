// Configuração global
const CONFIG = {
    animationSpeed: 300,
    scrollOffset: 80
};

// Flags opcionais de performance:
// - ?lite=1     força modo leve (sem efeitos pesados)
// - ?fullfx=1   força efeitos completos
const URL_PARAMS = new URLSearchParams(window.location.search);
const FORCE_LIGHTWEIGHT_MODE = URL_PARAMS.get('lite') === '1';
const FORCE_FULL_EFFECTS = URL_PARAMS.get('fullfx') === '1';

// Feature flag: when enabled, Work page rendering is handled by React (react-work.js)
const WORK_REACT_ENABLED = window.__WORK_REACT_ENABLED__ === true;

function getPerformanceProfile() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const deviceMemory = Number(navigator.deviceMemory || 0);
    const hardwareConcurrency = Number(navigator.hardwareConcurrency || 0);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = Boolean(connection?.saveData);
    const effectiveType = String(connection?.effectiveType || '').toLowerCase();
    const isSmallViewport = window.innerWidth < 1024;
    const lowRamDevice = deviceMemory > 0 && deviceMemory <= 4;
    const lowCpuDevice = hardwareConcurrency > 0 && hardwareConcurrency <= 4;
    const slowNetwork = effectiveType.includes('2g') || effectiveType === 'slow-2g';

    return {
        reducedMotion,
        saveData,
        lowRamDevice,
        lowCpuDevice,
        slowNetwork,
        isSmallViewport,
        lowEnd: reducedMotion || saveData || lowRamDevice || lowCpuDevice || slowNetwork
    };
}

const PERFORMANCE_PROFILE = getPerformanceProfile();

function shouldEnableHeavyEffects() {
    if (FORCE_FULL_EFFECTS) return true;
    if (FORCE_LIGHTWEIGHT_MODE) return false;
    return !PERFORMANCE_PROFILE.lowEnd;
}

// Array para armazenar projetos
let projects = [];

// GitHub Configuration
const GITHUB_CONFIG = {
    username: 'LucasPradoLPS',
    apiUrl: 'https://api.github.com/users/LucasPradoLPS/repos',
    maxRepos: 9, // Máximo de repositórios para exibir
    excludedRepos: [
        'ana', // Repositórios específicos para excluir
        'lucaspradolps.github.io', // GitHub Pages pessoal
        'config', // Arquivos de configuração
        'dotfiles', // Arquivos de configuração pessoal
    ],
    // Filtros de qualidade - apenas repositórios com essas características serão mostrados
    minStars: 0, // Mínimo de stars (0 = todos)
    showForksOnly: false, // true = mostrar apenas forks, false = não mostrar forks
    showArchivedRepos: false, // Mostrar repositórios arquivados
    preferredLanguages: ['JavaScript', 'Python', 'Java', 'TypeScript', 'HTML', 'CSS', 'React'] // Linguagens preferenciais (ordem de prioridade)
};

// =========================
// Services (SOLID)
// =========================

class NotificationService {
    constructor({ animationSpeed }) {
        this.animationSpeed = Number(animationSpeed) || 300;
    }

    show(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close" type="button">&times;</button>
            </div>
        `;

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

        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.remove(notification));
        }

        setTimeout(() => {
            if (notification.parentNode) {
                this.remove(notification);
            }
        }, 5000);

        return notification;
    }

    remove(notification) {
        if (!notification) return;
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, this.animationSpeed);
    }
}

class ProjectsStorage {
    constructor({ storageKey }) {
        this.storageKey = storageKey;
    }

    save(projectsList) {
        localStorage.setItem(this.storageKey, JSON.stringify(projectsList || []));
    }

    load() {
        const savedProjects = localStorage.getItem(this.storageKey);
        return savedProjects ? JSON.parse(savedProjects) : [];
    }
}

class GitHubService {
    constructor({ config, notifier, setLoading }) {
        this.config = config;
        this.notifier = notifier;
        this.setLoading = setLoading;
    }

    async fetchRepos() {
        try {
            if (typeof this.setLoading === 'function' && !WORK_REACT_ENABLED) {
                this.setLoading(true);
            }

            const response = await fetch(this.config.apiUrl + '?sort=updated&per_page=24&type=public', {
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'Portfolio-Website'
                }
            });

            if (!response.ok) {
                console.error(`GitHub API Error: ${response.status} - ${response.statusText}`);
                throw new Error(`GitHub API Error: ${response.status}`);
            }

            const repos = await response.json();

            return repos
                .filter(repo => {
                    const isPublic = !repo.private;
                    const isFork = repo.fork;
                    const isArchived = repo.archived;
                    const isExcluded = this.config.excludedRepos.includes(repo.name.toLowerCase());
                    const hasContent = repo.description || repo.name;
                    const meetStarRequirement = (repo.stargazers_count || 0) >= this.config.minStars;

                    let shouldInclude = isPublic && hasContent && !isExcluded && meetStarRequirement;

                    if (this.config.showForksOnly) {
                        shouldInclude = shouldInclude && isFork;
                    } else {
                        shouldInclude = shouldInclude && !isFork;
                    }

                    if (!this.config.showArchivedRepos) {
                        shouldInclude = shouldInclude && !isArchived;
                    }

                    return shouldInclude;
                })
                .sort((a, b) => {
                    const aLangIndex = this.config.preferredLanguages.indexOf(a.language || '');
                    const bLangIndex = this.config.preferredLanguages.indexOf(b.language || '');

                    if (aLangIndex !== -1 && bLangIndex === -1) return -1;
                    if (bLangIndex !== -1 && aLangIndex === -1) return 1;
                    if (aLangIndex !== -1 && bLangIndex !== -1) {
                        if (aLangIndex !== bLangIndex) return aLangIndex - bLangIndex;
                    }

                    const starsDiff = (b.stargazers_count || 0) - (a.stargazers_count || 0);
                    if (starsDiff !== 0) return starsDiff;

                    return new Date(b.updated_at) - new Date(a.updated_at);
                })
                .slice(0, this.config.maxRepos)
                .map(repo => ({
                    id: `github-${repo.id}`,
                    title: repo.name.replace(/-/g, ' ').replace(/_/g, ' ').toLowerCase()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' '),
                    description: repo.description || `Projeto ${repo.language ? `em ${repo.language}` : 'de desenvolvimento'} disponível no GitHub`,
                    category: detectCategory(repo),
                    // Thumbnail para manter o layout consistente (OpenGraph do GitHub)
                    image: `https://opengraph.githubassets.com/1/${this.config.username}/${repo.name}`,
                    link: repo.homepage || repo.html_url,
                    github: repo.html_url,
                    language: repo.language,
                    stars: repo.stargazers_count || 0,
                    forks: repo.forks_count || 0,
                    openIssues: repo.open_issues_count || 0,
                    updatedAt: repo.updated_at,
                    createdAt: repo.created_at,
                    size: repo.size || 0,
                    license: repo.license?.name || null,
                    topics: repo.topics || [],
                    defaultBranch: repo.default_branch,
                    hasIssues: repo.has_issues,
                    hasWiki: repo.has_wiki,
                    hasPages: repo.has_pages,
                    visibility: repo.visibility,
                    watchers: repo.watchers_count || 0,
                    projectType: detectProjectType(repo),
                    isGitHubRepo: true
                }));
        } catch (error) {
            console.error('Erro ao buscar repositórios do GitHub:', error);
            try {
                this.notifier?.('Erro ao carregar projetos do GitHub. Tentando novamente...', 'error');
            } catch (_) {
                // noop
            }
            return [];
        } finally {
            if (typeof this.setLoading === 'function' && !WORK_REACT_ENABLED) {
                this.setLoading(false);
            }
        }
    }
}

const notificationService = new NotificationService({ animationSpeed: CONFIG.animationSpeed });
const projectsStorage = new ProjectsStorage({ storageKey: 'portfolioProjects' });
const githubService = new GitHubService({
    config: GITHUB_CONFIG,
    notifier: (message, type) => notificationService.show(message, type),
    setLoading: (isLoading) => showLoadingState(isLoading)
});

// Facades (keep legacy API stable)
function showNotification(message, type = 'info') {
    return notificationService.show(message, type);
}

function removeNotification(notification) {
    notificationService.remove(notification);
}

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
    initializeAboutCounters();
    initializePortfolioCounters();
    initializeSkillBars();

    initializeHeroMicroInteractions();
    const heavyEffectsEnabled = shouldEnableHeavyEffects();

    if (heavyEffectsEnabled) {
        initializeArcadePointerInteractions();
        initializeSiteGamification();
        initializeArcadeSpaceshipCursor();
        initializeParticlesBackground();
    } else {
        document.body.classList.add('performance-lite');
        initializeParticlesBackground('lite');
    }

    // GitHub:
    // - Work page: carregar e renderizar repositórios no grid
    // - Home page: apenas carregar stats para preencher contadores do Sobre
    const hasPortfolioGrid = Boolean(document.getElementById('portfolioGrid'));
    const hasAboutCounters = Boolean(document.getElementById('aboutCounters'));

    if (hasPortfolioGrid && !WORK_REACT_ENABLED) {
        clearOldGitHubProjects();
        loadGitHubProjectsOnly();
        updatePortfolioStats();
    } else if (hasAboutCounters) {
        loadGitHubStatsOnly();
    }

    updateActiveNavLink();
    initializeTheme();
    // initializeTypingEffect(); // Removido - cursor de digitação desabilitado
});

let scrollRafScheduled = false;
let resizeDebounceId = null;

function initializeAnimations() {
    initializeLazyLoading();
    addProjectInteractivity();
}

function handleScroll() {
    if (scrollRafScheduled) return;

    scrollRafScheduled = true;
    requestAnimationFrame(() => {
        updateActiveNavLink();
        scrollRafScheduled = false;
    });
}

function handleResize() {
    clearTimeout(resizeDebounceId);
    resizeDebounceId = setTimeout(() => {
        if (window.innerWidth >= 1024) {
            closeMobileMenu();
        }
        updateActiveNavLink();
    }, 120);
}

function initializeHeroMicroInteractions() {
    const card = document.querySelector('.profile-card');
    if (!card) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (reducedMotion || !finePointer) return;

    let rafId = null;
    const state = {
        tiltX: 0,
        tiltY: 0,
        glowX: 50,
        glowY: 50
    };

    function apply() {
        card.style.setProperty('--card-tilt-x', `${state.tiltX.toFixed(2)}deg`);
        card.style.setProperty('--card-tilt-y', `${state.tiltY.toFixed(2)}deg`);
        card.style.setProperty('--glow-x', `${state.glowX.toFixed(2)}%`);
        card.style.setProperty('--glow-y', `${state.glowY.toFixed(2)}%`);
        rafId = null;
    }

    function scheduleApply() {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(apply);
    }

    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        state.tiltY = (x - 0.5) * 9;
        state.tiltX = (0.5 - y) * 9;
        state.glowX = x * 100;
        state.glowY = y * 100;
        scheduleApply();
    });

    card.addEventListener('mouseleave', () => {
        state.tiltX = 0;
        state.tiltY = 0;
        state.glowX = 50;
        state.glowY = 50;
        scheduleApply();
    });
}

function initializeArcadePointerInteractions() {
    if (!shouldEnableHeavyEffects()) return;

    const roamers = Array.from(document.querySelectorAll('.arcade-roamer'));
    if (!roamers.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (reducedMotion || !finePointer) return;

    let rafId = null;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let active = false;

    const radius = 170;
    const maxPush = 18;

    function resetRoamer(roamer) {
        roamer.classList.remove('is-near');
        const body = roamer.querySelector('.arcade-roamer-body');
        if (!body) return;
        body.style.setProperty('--arcade-push-x', '0px');
        body.style.setProperty('--arcade-push-y', '0px');
        body.style.setProperty('--arcade-scale', '1');
    }

    function update() {
        rafId = null;
        if (!active) return;

        roamers.forEach(roamer => {
            const body = roamer.querySelector('.arcade-roamer-body');
            if (!body) return;

            const rect = body.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const dx = pointerX - centerX;
            const dy = pointerY - centerY;
            const distance = Math.hypot(dx, dy);

            if (distance >= radius || distance === 0) {
                resetRoamer(roamer);
                return;
            }

            const intensity = 1 - distance / radius;
            const unitX = dx / distance;
            const unitY = dy / distance;
            const pushX = -unitX * maxPush * intensity;
            const pushY = -unitY * maxPush * intensity;

            roamer.classList.add('is-near');
            body.style.setProperty('--arcade-push-x', `${pushX.toFixed(2)}px`);
            body.style.setProperty('--arcade-push-y', `${pushY.toFixed(2)}px`);
            body.style.setProperty('--arcade-scale', `${(1 + intensity * 0.1).toFixed(3)}`);
        });
    }

    function scheduleUpdate() {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(update);
    }

    window.addEventListener('mousemove', (e) => {
        active = true;
        pointerX = e.clientX;
        pointerY = e.clientY;
        scheduleUpdate();
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
        active = false;
        roamers.forEach(resetRoamer);
    });
}

function initializeSiteGamification() {
    if (!shouldEnableHeavyEffects()) return;
    if (!document.body.classList.contains('arcade-mode')) return;
    if (document.querySelector('.game-hud')) return;

    const sections = Array.from(document.querySelectorAll('section[id]'))
        .filter(section => section.id && section.id.trim().length > 0)
        .filter(section => section.id.toLowerCase() !== 'portfolio');
    if (!sections.length) return;

    const questSections = sections.slice(0, 6);
    if (!questSections.length) return;

    const hud = document.createElement('aside');
    hud.className = 'game-hud';

    const questItemsHtml = questSections
        .map(section => {
            const label = section.id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `
                <div class="hud-quest-item" data-quest-id="${section.id}">
                    <span>${label}</span>
                    <span class="quest-status">Pendente</span>
                </div>
            `;
        })
        .join('');

    hud.innerHTML = `
        <div class="game-hud-title">Arcade Progress</div>
        <div class="hud-meta">
            <span id="hudLevelLabel">Nivel 1</span>
            <span id="hudXpLabel">XP 0</span>
        </div>
        <div class="hud-meta hud-meta-secondary">
            <span id="hudComboLabel">Combo x1</span>
            <span id="hudQuestProgressLabel">0/${questSections.length} quests</span>
        </div>
        <div class="hud-xp-track"><div class="hud-xp-fill" id="hudXpFill"></div></div>
        <div class="hud-quests" id="hudQuestList">${questItemsHtml}</div>
        <div class="hud-meta hud-meta-achievement">
            <span>Achievements</span>
            <span id="hudAchievementsLabel">0/3</span>
        </div>
    `;
    document.body.appendChild(hud);

    questSections.forEach((section, index) => {
        if (section.querySelector('.checkpoint-tag')) return;
        const checkpoint = document.createElement('span');
        checkpoint.className = 'checkpoint-tag';
        checkpoint.textContent = `Checkpoint ${String(index + 1).padStart(2, '0')}`;
        section.appendChild(checkpoint);
    });

    const visited = new Set();
    const achievements = new Set();
    const questPoints = 20;
    const comboWindowMs = 9000;
    const maxMultiplier = 4;

    let totalXp = 0;
    let comboCount = 0;
    let currentLevel = 1;
    let lastQuestAt = 0;

    const xpFill = document.getElementById('hudXpFill');
    const xpLabel = document.getElementById('hudXpLabel');
    const levelLabel = document.getElementById('hudLevelLabel');
    const comboLabel = document.getElementById('hudComboLabel');
    const questProgressLabel = document.getElementById('hudQuestProgressLabel');
    const achievementsLabel = document.getElementById('hudAchievementsLabel');

    function calculateLevel(xp) {
        return 1 + Math.floor(xp / 100);
    }

    function flashLevelUp(level) {
        document.body.classList.add('arcade-levelup');
        showNotification(`LEVEL UP! Agora voce esta no nivel ${level}`, 'success');
        setTimeout(() => {
            document.body.classList.remove('arcade-levelup');
        }, 900);
    }

    function unlockAchievement(key, message) {
        if (achievements.has(key)) return;
        achievements.add(key);
        if (achievementsLabel) achievementsLabel.textContent = `${achievements.size}/3`;
        showNotification(`Achievement desbloqueado: ${message}`, 'success');
    }

    function updateHud() {
        const completed = visited.size;
        const xp = totalXp;
        const level = calculateLevel(xp);
        const progressPct = (completed / questSections.length) * 100;

        if (xpFill) xpFill.style.width = `${Math.min(100, progressPct).toFixed(1)}%`;
        if (xpLabel) xpLabel.textContent = `XP ${xp}`;
        if (levelLabel) levelLabel.textContent = `Nivel ${level}`;
        if (comboLabel) comboLabel.textContent = `Combo x${Math.max(1, comboCount)}`;
        if (questProgressLabel) questProgressLabel.textContent = `${completed}/${questSections.length} quests`;

        if (level > currentLevel) {
            currentLevel = level;
            flashLevelUp(level);
        }
    }

    function markQuestCompleted(sectionId) {
        if (visited.has(sectionId)) return;

        const now = Date.now();
        if (now - lastQuestAt <= comboWindowMs) {
            comboCount += 1;
        } else {
            comboCount = 1;
        }
        lastQuestAt = now;

        const multiplier = Math.min(comboCount, maxMultiplier);
        const gainedXp = questPoints * multiplier;

        visited.add(sectionId);
        totalXp += gainedXp;

        const item = hud.querySelector(`.hud-quest-item[data-quest-id="${sectionId}"]`);
        if (item) {
            item.classList.add('completed');
            const status = item.querySelector('.quest-status');
            if (status) status.textContent = `+${gainedXp} XP`;
        }

        const section = document.getElementById(sectionId);
        const checkpoint = section?.querySelector('.checkpoint-tag');
        if (checkpoint) checkpoint.classList.add('completed');

        updateHud();

        const label = sectionId.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (multiplier > 1) {
            showNotification(`Quest concluida: ${label} (+${gainedXp} XP) COMBO x${multiplier}`, 'success');
        } else {
            showNotification(`Quest concluida: ${label} (+${gainedXp} XP)`, 'success');
        }

        if (visited.size >= 1) {
            unlockAchievement('first-quest', 'Primeira quest concluida');
        }
        if (multiplier >= 3) {
            unlockAchievement('combo-master', 'Combo Mestre x3');
        }
        if (visited.size === questSections.length) {
            unlockAchievement('all-quests', 'Campanha completa');
        }
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                markQuestCompleted(entry.target.id);
            }
        });
    }, { threshold: 0.45 });

    questSections.forEach(section => observer.observe(section));
    updateHud();
}

function initializeArcadeSpaceshipCursor() {
    if (!shouldEnableHeavyEffects()) return;
    if (!document.body.classList.contains('arcade-mode')) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (reducedMotion || !finePointer) return;

    if (document.querySelector('.arcade-cursor-ship')) return;

    const ship = document.createElement('div');
    ship.className = 'arcade-cursor-ship';
    document.body.appendChild(ship);
    document.body.classList.add('arcade-cursor-enabled');

    const breakablesLayer = document.createElement('div');
    breakablesLayer.className = 'arcade-breakables-layer';
    document.body.appendChild(breakablesLayer);

    const breakables = [];
    const breakableCount = Math.max(8, Math.min(14, Math.floor(window.innerWidth / 120)));
    const breakableSize = 20;
    const breakableMargin = 12;

    const exclusionSelector = [
        '.professional-photo-container',
        '.about-photo',
        '.profile-card',
        '.mission-card',
        '.portfolio-item',
        '.contact-form',
        '.arcade-photo-hud',
        '.arcade-photo-hp',
        '.section-title',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'li'
    ].join(',');

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function expandRect(rect, padding = 8) {
        return {
            left: clamp(rect.left - padding, 0, window.innerWidth),
            top: clamp(rect.top - padding, 0, window.innerHeight),
            right: clamp(rect.right + padding, 0, window.innerWidth),
            bottom: clamp(rect.bottom + padding, 0, window.innerHeight)
        };
    }

    function collectExclusionRects() {
        const nodes = document.querySelectorAll(exclusionSelector);
        const rects = [];

        nodes.forEach(node => {
            if (!node || !node.getBoundingClientRect) return;
            const rect = node.getBoundingClientRect();
            if (rect.width < 8 || rect.height < 8) return;
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;
            if (rect.right < 0 || rect.left > window.innerWidth) return;
            rects.push(expandRect(rect, breakableMargin));
        });

        return rects;
    }

    function intersects(a, b) {
        return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    }

    function isCandidateSafe(x, y, exclusionRects) {
        const candidateRect = {
            left: x,
            top: y,
            right: x + breakableSize,
            bottom: y + breakableSize
        };
        return !exclusionRects.some(rect => intersects(candidateRect, rect));
    }

    function findSafePosition(exclusionRects) {
        const minX = breakableMargin;
        const maxX = Math.max(minX, window.innerWidth - breakableSize - breakableMargin);
        const minY = breakableMargin;
        const maxY = Math.max(minY, window.innerHeight - breakableSize - breakableMargin);

        for (let attempt = 0; attempt < 56; attempt++) {
            const x = minX + Math.random() * (maxX - minX);
            const y = minY + Math.random() * (maxY - minY);
            if (isCandidateSafe(x, y, exclusionRects)) {
                return { x, y };
            }
        }

        // Fallback: prefer screen edges when central area is dense with content.
        const edgeCandidates = [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: minX, y: maxY },
            { x: maxX, y: maxY },
            { x: minX, y: (minY + maxY) / 2 },
            { x: maxX, y: (minY + maxY) / 2 },
            { x: (minX + maxX) / 2, y: minY },
            { x: (minX + maxX) / 2, y: maxY }
        ];

        for (const candidate of edgeCandidates) {
            if (isCandidateSafe(candidate.x, candidate.y, exclusionRects)) {
                return candidate;
            }
        }

        return { x: minX, y: minY };
    }

    function spawnBreakable(node, exclusionRects = collectExclusionRects()) {
        const pos = findSafePosition(exclusionRects);
        node.style.left = `${Math.round(pos.x)}px`;
        node.style.top = `${Math.round(pos.y)}px`;
        node.classList.remove('broken');
    }

    const initialExclusionRects = collectExclusionRects();

    for (let i = 0; i < breakableCount; i++) {
        const block = document.createElement('div');
        block.className = 'arcade-breakable';
        spawnBreakable(block, initialExclusionRects);
        breakables.push(block);
        breakablesLayer.appendChild(block);
    }

    function keepBreakablesOutOfContent() {
        const exclusionRects = collectExclusionRects();
        breakables.forEach(block => {
            if (block.classList.contains('broken')) return;
            const rect = block.getBoundingClientRect();
            if (!isCandidateSafe(rect.left, rect.top, exclusionRects)) {
                spawnBreakable(block, exclusionRects);
            }
        });
    }

    let rafId = null;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let active = false;

    function frame() {
        rafId = null;
        currentX += (targetX - currentX) * 0.36;
        currentY += (targetY - currentY) * 0.36;
        ship.style.left = `${currentX}px`;
        ship.style.top = `${currentY}px`;

        if (active && (Math.abs(targetX - currentX) > 0.2 || Math.abs(targetY - currentY) > 0.2)) {
            rafId = requestAnimationFrame(frame);
        }
    }

    function scheduleFrame() {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(frame);
    }

    const interactiveSelector = [
        'a',
        'button',
        'input',
        'textarea',
        'select',
        '[role="button"]',
        '.portfolio-item',
        '.mission-card',
        '.nav-link',
        '.hud-quest-item'
    ].join(',');

    function createBeam(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        const beam = document.createElement('div');
        beam.className = 'arcade-shot-beam';
        beam.style.left = `${fromX}px`;
        beam.style.top = `${fromY}px`;
        beam.style.width = `${distance.toFixed(1)}px`;
        beam.style.transform = `rotate(${angle.toFixed(2)}deg)`;
        document.body.appendChild(beam);
        setTimeout(() => beam.remove(), 220);
    }

    function createMuzzleFlash(x, y) {
        const flash = document.createElement('div');
        flash.className = 'arcade-muzzle-flash';
        flash.style.left = `${x}px`;
        flash.style.top = `${y}px`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 140);
    }

    function createProjectile(fromX, fromY, toX, toY) {
        const projectile = document.createElement('div');
        projectile.className = 'arcade-shot-projectile';
        projectile.style.left = `${fromX}px`;
        projectile.style.top = `${fromY}px`;
        document.body.appendChild(projectile);

        projectile.animate([
            {
                left: `${fromX}px`,
                top: `${fromY}px`,
                opacity: 1,
                transform: 'translate(-50%, -50%) scale(1)'
            },
            {
                left: `${toX}px`,
                top: `${toY}px`,
                opacity: 0.95,
                transform: 'translate(-50%, -50%) scale(0.82)'
            }
        ], {
            duration: 180,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            fill: 'forwards'
        });

        setTimeout(() => projectile.remove(), 220);
    }

    function createImpact(x, y) {
        const impact = document.createElement('div');
        impact.className = 'arcade-shot-impact';
        impact.style.left = `${x}px`;
        impact.style.top = `${y}px`;
        document.body.appendChild(impact);
        setTimeout(() => impact.remove(), 260);
    }

    function breakNearest(targetX, targetY) {
        let nearest = null;
        let nearestDistance = Infinity;

        breakables.forEach(block => {
            if (block.classList.contains('broken')) return;
            const rect = block.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const distance = Math.hypot(centerX - targetX, centerY - targetY);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = { block, centerX, centerY };
            }
        });

        if (!nearest || nearestDistance > 90) {
            createImpact(targetX, targetY);
            return;
        }

        nearest.block.classList.add('broken');
        createImpact(nearest.centerX, nearest.centerY);
        setTimeout(() => spawnBreakable(nearest.block), 1400);
    }

    window.addEventListener('mousemove', (e) => {
        active = true;
        targetX = e.clientX;
        targetY = e.clientY;

        const interactive = e.target && e.target.closest ? e.target.closest(interactiveSelector) : null;
        ship.classList.toggle('is-hover', Boolean(interactive));
        scheduleFrame();
    }, { passive: true });

    window.addEventListener('mousedown', () => {
        ship.classList.add('is-click');
    });

    window.addEventListener('mouseup', () => {
        ship.classList.remove('is-click');
    });

    window.addEventListener('click', (e) => {
        const interactive = e.target && e.target.closest ? e.target.closest(interactiveSelector) : null;
        if (interactive) return;

        // Approximate the ship nose so shots visibly come from the rocket tip.
        const fromX = currentX + 10;
        const fromY = currentY - 10;
        const toX = e.clientX;
        const toY = e.clientY;

        createMuzzleFlash(fromX, fromY);
        createProjectile(fromX, fromY, toX, toY);
        createBeam(fromX, fromY, toX, toY);
        breakNearest(toX, toY);
    });

    window.addEventListener('mouseleave', () => {
        active = false;
        ship.classList.remove('is-hover');
        ship.classList.remove('is-click');
    });

    window.addEventListener('blur', () => {
        active = false;
        ship.classList.remove('is-hover');
        ship.classList.remove('is-click');
    });

    window.addEventListener('resize', () => {
        const exclusionRects = collectExclusionRects();
        breakables.forEach(block => spawnBreakable(block, exclusionRects));
    });

    let scrollRaf = null;
    window.addEventListener('scroll', () => {
        if (scrollRaf !== null) return;
        scrollRaf = requestAnimationFrame(() => {
            scrollRaf = null;
            keepBreakablesOutOfContent();
        });
    }, { passive: true });
}

async function loadGitHubStatsOnly() {
    try {
        const githubRepos = await fetchGitHubRepos();
        if (githubRepos.length > 0) {
            projects = [...githubRepos];
            updatePortfolioStats();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar stats do GitHub:', error);
    }
}

function animateCounter(el, to, duration = 900) {
    const target = Number(to) || 0;
    const from = Number(el.textContent) || 0;
    const start = performance.now();

    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const current = Math.floor(from + (target - from) * progress);
        el.textContent = String(current);
        if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

function maybeAnimateAboutCounters() {
    const container = document.getElementById('aboutCounters');
    if (!container) return;
    if (container.dataset.animated === 'true') return;
    if (container.dataset.inview !== 'true') return;

    const projectsEl = document.getElementById('aboutTotalProjects');
    const techEl = document.getElementById('aboutTotalTechnologies');

    if (projectsEl) animateCounter(projectsEl, projectsEl.dataset.counterTarget);
    if (techEl) animateCounter(techEl, techEl.dataset.counterTarget);

    container.dataset.animated = 'true';
}

function maybeAnimatePortfolioCounters() {
    const section = document.getElementById('portfolio');
    if (!section) return;
    if (section.dataset.countersAnimated === 'true') return;
    if (section.dataset.inview !== 'true') return;

    const totalProjectsEl = document.getElementById('totalProjects');
    const totalTechnologiesEl = document.getElementById('totalTechnologies');
    const totalStarsEl = document.getElementById('totalStars');

    if (totalProjectsEl) animateCounter(totalProjectsEl, totalProjectsEl.dataset.counterTarget);
    if (totalTechnologiesEl) animateCounter(totalTechnologiesEl, totalTechnologiesEl.dataset.counterTarget);
    if (totalStarsEl) animateCounter(totalStarsEl, totalStarsEl.dataset.counterTarget);

    section.dataset.countersAnimated = 'true';
}

function initializePortfolioCounters() {
    const section = document.getElementById('portfolio');
    if (!section || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                section.dataset.inview = 'true';
                maybeAnimatePortfolioCounters();
                observer.unobserve(section);
            }
        });
    }, { threshold: 0.2 });

    observer.observe(section);
}

function initializeAboutCounters() {
    const container = document.getElementById('aboutCounters');
    if (!container || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                container.dataset.inview = 'true';
                maybeAnimateAboutCounters();
                observer.unobserve(container);
            }
        });
    }, { threshold: 0.35 });

    observer.observe(container);
}

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
    if (!WORK_REACT_ENABLED) {
        elements.syncGitHubBtn?.addEventListener('click', handleGitHubSync);
    }
    elements.closeModal?.addEventListener('click', closeProjectModal);
    elements.projectModal?.addEventListener('click', handleModalOutsideClick);
    elements.projectForm?.addEventListener('submit', handleProjectSubmit);

    // Contact form
    elements.contactForm?.addEventListener('submit', handleContactSubmit);

    // Make contact items interactive (clicking email item opens form and pre-fills subject)
    try {
        const contactItems = document.querySelectorAll('.contact-item');
        contactItems.forEach(item => {
            const heading = item.querySelector('.contact-text h3');
            if (heading && heading.textContent && heading.textContent.trim().toLowerCase() === 'email') {
                item.style.cursor = 'pointer';
                item.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    // Scroll to contact form
                    const form = document.getElementById('contactForm');
                    if (form) {
                        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Prefill subject so user sees context
                        const subjectInput = form.querySelector('input[name="subject"]');
                        if (subjectInput && subjectInput.value.trim() === '') {
                            subjectInput.value = 'Contato via site';
                        }
                    }
                });
            }
        });
    } catch (err) {
        console.warn('Could not attach contact item handlers', err);
    }

    // Theme toggle
    elements.themeToggle?.addEventListener('click', toggleTheme);

    // Scroll events
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    // Global keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeydown);
}

function syncMobileMenuA11y() {
    const isExpanded = Boolean(elements.navMenu && !elements.navMenu.classList.contains('hidden'));
    if (elements.hamburger) {
        elements.hamburger.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    }
    if (elements.navMenu) {
        elements.navMenu.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
    }
}

function handleGlobalKeydown(e) {
    if (e.key !== 'Escape') return;

    // Close mobile menu
    closeMobileMenu();

    // Close modal if open
    if (elements.projectModal && elements.projectModal.style.display === 'block') {
        closeProjectModal();
    }
}

// Mobile Menu Functions
function toggleMobileMenu() {
    if (elements.hamburger) elements.hamburger.classList.toggle('active');
    if (elements.navMenu) {
        elements.navMenu.classList.toggle('active');
        elements.navMenu.classList.toggle('hidden');
    }

    syncMobileMenuA11y();
}

function closeMobileMenu() {
    if (elements.hamburger) elements.hamburger.classList.remove('active');
    if (elements.navMenu) {
        elements.navMenu.classList.remove('active');
        elements.navMenu.classList.add('hidden');
    }

    syncMobileMenuA11y();
}

// Navigation Functions
function handleNavClick(e) {
    const href = this.getAttribute('href') || '';

    // Em navegação multi-página, não interceptar links normais
    if (!href.startsWith('#')) return;

    e.preventDefault();
    const targetElement = document.querySelector(href);

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
    const button = e.currentTarget || e.target;
    const filter = button?.getAttribute?.('data-filter');
    if (!filter) return;
    
    // Update active filter button
    elements.filterBtns.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
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
    if (elements.projectModal) {
        elements.projectModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    } else {
        console.warn('openProjectModal: projectModal element not found');
    }
}

function closeProjectModal() {
    if (elements.projectModal) elements.projectModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    if (elements.projectForm && typeof elements.projectForm.reset === 'function') elements.projectForm.reset();
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
            ${project.language ? `<span class="language">${project.language}</span>` : ''}
            ${project.stars >= 0 ? `<span class="stars"><i class="fas fa-star"></i> ${project.stars}</span>` : ''}
        </div>
    ` : '';
    
    // Atributos especiais para repositórios do GitHub
    const githubAttributes = project.isGitHubRepo ? `data-github="true"` : '';
    
    // Remover badges de atividade conforme solicitado
    const hasExternalLink = Boolean(project.link);
    const updatedMeta = project.updatedAt ? `Atualizado ${formatDate(project.updatedAt)}` : '';
    const projectTypeLabel = project.isGitHubRepo ? 'Repositorio' : 'Projeto';

    const stats = [];
    if (typeof project.stars === 'number') stats.push(`<span class="project-stat-chip"><i class="fas fa-star"></i>${project.stars}</span>`);
    if (typeof project.forks === 'number') stats.push(`<span class="project-stat-chip"><i class="fas fa-code-branch"></i>${project.forks}</span>`);
    if (typeof project.openIssues === 'number') stats.push(`<span class="project-stat-chip"><i class="fas fa-bug"></i>${project.openIssues}</span>`);
    if (typeof project.size === 'number' && project.size > 0) stats.push(`<span class="project-stat-chip"><i class="fas fa-database"></i>${formatFileSize(project.size)}</span>`);

    const mediaHtml = project.image
        ? `<img src="${project.image}" alt="${project.title}" class="portfolio-img" loading="lazy">`
        : `
            <div class="portfolio-media-fallback" aria-hidden="true">
                <i class="fas fa-cubes"></i>
                <h4>${project.title}</h4>
                <span>${project.language || project.category || 'Projeto Web'}</span>
            </div>
        `;
    
    const projectHTML = `
        <div class="portfolio-item" data-category="${project.category}" data-id="${project.id}" ${githubAttributes}>
            ${githubBadge}
            ${mediaHtml}
            <div class="portfolio-content">
                <div class="project-topline">
                    <span class="project-type-badge">${projectTypeLabel}</span>
                    ${updatedMeta ? `<span class="project-updated">${updatedMeta}</span>` : ''}
                </div>
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                ${stats.length ? `<div class="project-stats">${stats.join('')}</div>` : ''}
                ${project.isGitHubRepo ? `
                    <div class="project-tags">
                        ${project.language ? `<span class="project-tag">${project.language}</span>` : ''}
                        ${(project.topics || []).slice(0, 3).map(t => `<span class="project-tag">${t}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="portfolio-links portfolio-actions">
                    ${project.isGitHubRepo ? `
                        ${hasExternalLink ? `
                            <a href="${project.link}" target="_blank" rel="noopener noreferrer" class="portfolio-link portfolio-link--primary">
                                <i class="fas fa-external-link-alt"></i> Ver Projeto
                            </a>
                        ` : ''}
                        <a href="${project.github}" target="_blank" rel="noopener noreferrer" class="portfolio-link">
                            <i class="fab fa-github"></i> Código
                        </a>
                    ` : `
                        ${hasExternalLink ? `
                            <a href="${project.link}" target="_blank" rel="noopener noreferrer" class="portfolio-link portfolio-link--primary">
                                <i class="fas fa-external-link-alt"></i> Ver Projeto
                            </a>
                        ` : ''}
                        ${project.github ? `
                            <a href="${project.github}" target="_blank" rel="noopener noreferrer" class="portfolio-link">
                                <i class="fab fa-github"></i> GitHub
                            </a>
                        ` : ''}
                        <button onclick="removeProject(${project.id})" class="portfolio-link portfolio-link--danger">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
    
    if (elements.portfolioGrid) elements.portfolioGrid.insertAdjacentHTML('beforeend', projectHTML);
    
    // Animate new project
    const newProject = elements.portfolioGrid ? elements.portfolioGrid.lastElementChild : null;
    if (newProject) {
        newProject.style.opacity = '0';
        newProject.style.transform = 'translateY(20px)';

        setTimeout(() => {
            newProject.style.transition = 'all 0.5s ease';
            newProject.style.opacity = '1';
            newProject.style.transform = 'translateY(0)';
        }, 100);
    }
}

function isFeaturedRepo(project) {
    const topics = Array.isArray(project?.topics) ? project.topics : [];
    return topics.some(t => String(t).toLowerCase() === 'featured');
}

function pickFeaturedRepo(repos) {
    if (!Array.isArray(repos)) return null;
    return repos.find(isFeaturedRepo) || null;
}

function renderFeaturedProject(project) {
    const container = document.getElementById('featuredProject');
    if (!container) return;

    if (!project) {
        container.innerHTML = '';
        return;
    }

    const hasExternalLink = Boolean(project.link);
    const topics = Array.isArray(project.topics) ? project.topics : [];
    const tags = [project.language, ...topics.filter(t => String(t).toLowerCase() !== 'featured')]
        .filter(Boolean)
        .slice(0, 5);

    const featuredStats = [];
    if (typeof project.stars === 'number') featuredStats.push(`<span class="project-stat-chip"><i class="fas fa-star"></i>${project.stars}</span>`);
    if (typeof project.forks === 'number') featuredStats.push(`<span class="project-stat-chip"><i class="fas fa-code-branch"></i>${project.forks}</span>`);
    if (typeof project.openIssues === 'number') featuredStats.push(`<span class="project-stat-chip"><i class="fas fa-bug"></i>${project.openIssues}</span>`);
    if (typeof project.watchers === 'number') featuredStats.push(`<span class="project-stat-chip"><i class="fas fa-eye"></i>${project.watchers}</span>`);

    container.innerHTML = `
        <div class="featured-label">Projeto em destaque</div>
        <div class="portfolio-item portfolio-item--featured" data-id="${project.id}" data-github="true">
            ${project.image
                ? `<img src="${project.image}" alt="${project.title}" class="portfolio-img" loading="lazy">`
                : `
                    <div class="portfolio-media-fallback" aria-hidden="true">
                        <i class="fas fa-trophy"></i>
                        <h4>${project.title}</h4>
                        <span>${project.language || 'Repositorio em destaque'}</span>
                    </div>
                `
            }
            <div class="portfolio-content">
                <div class="featured-header">
                    <h3>${project.title}</h3>
                    <div class="featured-meta">
                        <span class="stars"><i class="fas fa-star"></i> ${project.stars ?? 0}</span>
                        ${project.updatedAt ? `<span class="updated">Atualizado há ${formatDate(project.updatedAt)}</span>` : ''}
                    </div>
                </div>
                <p>${project.description}</p>
                ${featuredStats.length ? `<div class="project-stats">${featuredStats.join('')}</div>` : ''}

                ${tags.length ? `
                    <div class="project-tags">
                        ${tags.map(t => `<span class="project-tag">${t}</span>`).join('')}
                    </div>
                ` : ''}

                <div class="portfolio-links portfolio-actions">
                    ${hasExternalLink ? `
                        <a href="${project.link}" target="_blank" rel="noopener noreferrer" class="portfolio-link portfolio-link--primary">
                            <i class="fas fa-external-link-alt"></i> Ver Projeto
                        </a>
                    ` : ''}
                    <a href="${project.github}" target="_blank" rel="noopener noreferrer" class="portfolio-link">
                        <i class="fab fa-github"></i> Código
                    </a>
                </div>
            </div>
        </div>
    `;
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
    projectsStorage.save(projects);
}

function loadProjectsFromStorage() {
    return projectsStorage.load();
}

// Contact Form Functions
function handleContactSubmit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : null;
    const formData = new FormData(e.target);

    const fromName = String(formData.get('from_name') || '').trim();
    const replyTo = String(formData.get('reply_to') || '').trim();
    const subject = String(formData.get('subject') || '').trim();
    const message = String(formData.get('message') || '').trim();

    if (!fromName || !replyTo || !subject || !message) {
        showNotification('Preencha todos os campos antes de enviar.', 'error');
        return;
    }

    const whatsappNumber = '5531999380844';
    const text = [
        '*Nova mensagem do portfólio*',
        '',
        `*Nome:* ${fromName}`,
        `*Email:* ${replyTo}`,
        `*Assunto:* ${subject}`,
        '',
        '*Mensagem:*',
        message
    ].join('\n');

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Abrindo WhatsApp...';
    }

    const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
        window.location.href = whatsappUrl;
    }

    showNotification('Redirecionando para o WhatsApp...', 'success');
    e.target.reset();

    if (submitBtn) {
        setTimeout(() => {
            submitBtn.disabled = false;
            if (originalBtnText) submitBtn.textContent = originalBtnText;
        }, 400);
    }
}

function initializeSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');
    if (!skillBars.length) return;

    skillBars.forEach(bar => {
        const targetWidth = bar.dataset.width || bar.getAttribute('data-width') || bar.style.width || '0%';
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = targetWidth;
        }, 200);
    });
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
        // Avoid rebinding when projects are re-rendered
        if (item.dataset.hoverBound === 'true') return;

        // Mark as bound even when there's no image, so we don't keep revisiting
        // GitHub cards (or cards without images) on subsequent calls.
        item.dataset.hoverBound = 'true';

        const img = item.querySelector('.portfolio-img');
        // GitHub repos don't have a local image; skip image hover effect
        if (!img) return;

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
    if (!string || typeof string !== 'string') return false;
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

function initializeParticlesBackground(mode = 'normal') {
    const isLiteMode = mode === 'lite';
    if (!isLiteMode && !shouldEnableHeavyEffects()) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!document.getElementById('tsparticles')) return;
    if (window.tsParticles) return;

    const particlesConfig = isLiteMode
        ? {
            fpsLimit: 24,
            background: { color: { value: 'transparent' } },
            fullScreen: { enable: true, zIndex: -1 },
            particles: {
                number: { value: 7, density: { enable: true, area: 1200 } },
                color: { value: '#22c55e' },
                size: { value: 1.6 },
                move: { enable: true, speed: 0.32, direction: 'none', outModes: { default: 'out' } },
                links: { enable: true, color: '#22c55e', opacity: 0.08, distance: 105 },
                opacity: { value: 0.2 }
            },
            detectRetina: false
        }
        : {
            fpsLimit: 40,
            background: { color: { value: 'transparent' } },
            fullScreen: { enable: true, zIndex: -1 },
            particles: {
                number: { value: 16, density: { enable: true, area: 1000 } },
                color: { value: '#22c55e' },
                size: { value: 2 },
                move: { enable: true, speed: 0.55, direction: 'none', outModes: { default: 'out' } },
                links: { enable: true, color: '#22c55e', opacity: 0.14, distance: 125 },
                opacity: { value: 0.3 }
            },
            detectRetina: true
        };

    const loadParticles = () => {
        if (window.tsParticles) {
            return window.tsParticles.load('tsparticles', particlesConfig).catch(() => {
                // noop: background particles are decorative only
            });
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js';
        script.async = true;
        script.onload = () => {
            if (!window.tsParticles) return;
            window.tsParticles.load('tsparticles', particlesConfig).catch(() => {
                // noop: background particles are decorative only
            });
        };
        document.body.appendChild(script);
    };

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadParticles, { timeout: 2200 });
        return;
    }

    setTimeout(loadParticles, 800);
}

// Theme Functions
function initializeTheme() {
    // Direção atual do layout: dark fixo e minimal
    try {
        localStorage.removeItem('portfolioTheme');
    } catch (_) {
        // ignore
    }

    document.documentElement.dataset.themeLocked = 'true';
    setTheme('dark');
}

function toggleTheme() {
    if (document.documentElement.dataset.themeLocked === 'true') return;

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
    return githubService.fetchRepos();
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
    }
}

// Nova função para carregar apenas projetos do GitHub (sem projetos de exemplo)
async function loadGitHubProjectsOnly() {
    console.log('🚀 Carregando apenas repositórios do GitHub...');

    const portfolioGrid = document.getElementById('portfolioGrid');
    const cachedProjects = loadProjectsFromStorage();
    const gridHasProjects = Boolean(portfolioGrid?.querySelector('.portfolio-item'));

    try {
        const githubRepos = await fetchGitHubRepos();

        // Se não carregou nada (erro/rate limit/offline ou filtro muito restritivo), não apague o que já está na tela.
        if (!githubRepos || githubRepos.length === 0) {
            if (projects.length > 0) {
                // Se há projetos em memória/cache, mas o grid está vazio, renderiza do cache atual.
                if (portfolioGrid && !gridHasProjects) {
                    portfolioGrid.innerHTML = '';
                    renderFeaturedProject(null);
                    const featuredRepo = pickFeaturedRepo(projects);
                    if (featuredRepo) {
                        renderFeaturedProject(featuredRepo);
                    }
                    const reposForGrid = featuredRepo
                        ? projects.filter(r => r.github !== featuredRepo.github)
                        : projects;
                    reposForGrid.forEach(repo => renderProject(repo));
                    updatePortfolioStats();
                }

                showNotification('Não foi possível atualizar do GitHub agora. Mantendo os projetos atuais.', 'info');
                return;
            }

            if (cachedProjects.length > 0 && portfolioGrid) {
                projects = [...cachedProjects];
                portfolioGrid.innerHTML = '';
                renderFeaturedProject(null);
                const featuredRepo = pickFeaturedRepo(projects);
                if (featuredRepo) {
                    renderFeaturedProject(featuredRepo);
                }
                const reposForGrid = featuredRepo
                    ? projects.filter(r => r.github !== featuredRepo.github)
                    : projects;
                reposForGrid.forEach(repo => renderProject(repo));
                updatePortfolioStats();
                showNotification('Mostrando projetos do cache local. Tente atualizar novamente mais tarde.', 'info');
                return;
            }

            if (portfolioGrid) {
                portfolioGrid.innerHTML = `
                    <div class="portfolio-empty" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: inherit;">
                        <p>Nenhum projeto encontrado no momento.</p>
                    </div>
                `;
            }

            showNotification('Nenhum repositório encontrado no GitHub agora.', 'info');
            return;
        }

        if (githubRepos.length > 0) {
            const featuredRepo = pickFeaturedRepo(githubRepos);

            // Substituir todos os projetos pelos do GitHub
            projects = [...githubRepos];

            // Limpar grid/featured apenas quando a busca foi bem-sucedida
            if (portfolioGrid) {
                portfolioGrid.innerHTML = '';
            }
            renderFeaturedProject(null);

            // Renderizar featured primeiro (se existir), e não duplicar no grid
            if (featuredRepo) {
                renderFeaturedProject(featuredRepo);
            }

            const reposForGrid = featuredRepo
                ? githubRepos.filter(r => r.github !== featuredRepo.github)
                : githubRepos;

            // Renderizar cada projeto
            reposForGrid.forEach(repo => renderProject(repo));
            
            saveProjectsToStorage();
            updatePortfolioStats();
            
            console.log(`📊 Total de projetos carregados: ${projects.length}`);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar repositórios:', error);
        if (projects.length === 0 && cachedProjects.length > 0 && portfolioGrid) {
            projects = [...cachedProjects];
            portfolioGrid.innerHTML = '';
            renderFeaturedProject(null);
            const featuredRepo = pickFeaturedRepo(projects);
            if (featuredRepo) {
                renderFeaturedProject(featuredRepo);
            }
            const reposForGrid = featuredRepo
                ? projects.filter(r => r.github !== featuredRepo.github)
                : projects;
            reposForGrid.forEach(repo => renderProject(repo));
            updatePortfolioStats();
            showNotification('Erro ao atualizar do GitHub. Mostrando cache local.', 'error');
        }
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
    
    if (totalProjectsEl) totalProjectsEl.dataset.counterTarget = String(totalProjects);
    if (totalTechnologiesEl) totalTechnologiesEl.dataset.counterTarget = String(technologies.length);
    if (totalStarsEl) totalStarsEl.dataset.counterTarget = String(totalStars);

    // Se ainda não animou, mantém valor inicial estático (0); se já animou, atualiza imediatamente.
    const portfolioSection = document.getElementById('portfolio');
    const countersAnimated = portfolioSection?.dataset.countersAnimated === 'true';

    if (totalProjectsEl) totalProjectsEl.textContent = countersAnimated ? String(totalProjects) : (totalProjectsEl.textContent || '0');
    if (totalTechnologiesEl) totalTechnologiesEl.textContent = countersAnimated ? String(technologies.length) : (totalTechnologiesEl.textContent || '0');
    if (totalStarsEl) totalStarsEl.textContent = countersAnimated ? String(totalStars) : (totalStarsEl.textContent || '0');

    // About counters (animados quando entram na tela)
    const aboutProjectsEl = document.getElementById('aboutTotalProjects');
    const aboutTechEl = document.getElementById('aboutTotalTechnologies');

    if (aboutProjectsEl) aboutProjectsEl.dataset.counterTarget = String(totalProjects);
    if (aboutTechEl) aboutTechEl.dataset.counterTarget = String(technologies.length);

    maybeAnimateAboutCounters();

    // Portfolio counters (animados quando entram na tela)
    maybeAnimatePortfolioCounters();
}

async function handleGitHubSync() {
    console.log('🔄 Iniciando sincronização do GitHub...');

    await loadGitHubProjectsOnly();
}

function showLoadingState(isLoading) {
    const portfolioGrid = elements.portfolioGrid;
    const addProjectBtn = elements.addProjectBtn;

    // Some pages (Home/Contact) don't have a grid.
    if (!portfolioGrid) {
        if (addProjectBtn) addProjectBtn.disabled = Boolean(isLoading);
        return;
    }
    
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