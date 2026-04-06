/* React renderer for Work page (no build step)
   - Mounts into #workReactRoot
   - Uses existing GitHub fetch + helpers from script.js (fetchGitHubRepos, pickFeaturedRepo, formatDate)
*/

(function () {
    'use strict';

    function isWorkPage() {
        return Boolean(document.getElementById('workReactRoot'));
    }

    function hasReact() {
        return Boolean(window.React && window.ReactDOM);
    }

    function h() {
        // eslint-disable-next-line prefer-rest-params
        return React.createElement.apply(null, arguments);
    }

    function safeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function getTags(project) {
        const topics = safeArray(project && project.topics);
        const tags = [];
        if (project && project.language) tags.push(project.language);
        for (const topic of topics) {
            if (String(topic).toLowerCase() === 'featured') continue;
            tags.push(topic);
        }
        return tags.filter(Boolean).slice(0, 5);
    }

    function ProjectTags(props) {
        const tags = safeArray(props.tags);
        if (!tags.length) return null;

        return h(
            'div',
            { className: 'project-tags' },
            tags.map((t, idx) => h('span', { key: String(t) + idx, className: 'project-tag' }, String(t)))
        );
    }

    function ProjectLinks(props) {
        const project = props.project;
        const hasExternalLink = Boolean(project && project.link);

        const links = [];
        if (hasExternalLink) {
            links.push(
                h(
                    'a',
                    {
                        key: 'external',
                        href: project.link,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        className: 'portfolio-link'
                    },
                    h('i', { className: 'fas fa-external-link-alt' }),
                    ' Ver Projeto'
                )
            );
        }

        links.push(
            h(
                'a',
                {
                    key: 'code',
                    href: project.github,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'portfolio-link'
                },
                h('i', { className: 'fab fa-github' }),
                ' Código'
            )
        );

        return h('div', { className: 'portfolio-links' }, links);
    }

    function GitHubBadge(props) {
        const project = props.project;
        if (!project || !project.isGitHubRepo) return null;

        return h(
            'div',
            { className: 'github-badge' },
            h('i', { className: 'fab fa-github' }),
            project.language ? h('span', { className: 'language' }, project.language) : null,
            typeof project.stars === 'number'
                ? h(
                    'span',
                    { className: 'stars' },
                    h('i', { className: 'fas fa-star' }),
                    ' ',
                    String(project.stars)
                )
                : null
        );
    }

    function ProjectCard(props) {
        const project = props.project;
        const tags = getTags(project).slice(0, 4);

        return h(
            'div',
            {
                className: 'portfolio-item',
                'data-category': project.category,
                'data-id': project.id,
                'data-github': project.isGitHubRepo ? 'true' : undefined
            },
            h(GitHubBadge, { project: project }),
            h(
                'div',
                { className: 'portfolio-content' },
                h('h3', null, project.title),
                h('p', null, project.description),
                project.isGitHubRepo ? h(ProjectTags, { tags: tags }) : null,
                h(ProjectLinks, { project: project })
            )
        );
    }

    function FeaturedProject(props) {
        const project = props.project;
        if (!project) return null;

        const tags = getTags(project);
        const updatedLabel = project.updatedAt && typeof window.formatDate === 'function'
            ? 'Atualizado há ' + window.formatDate(project.updatedAt)
            : null;

        const hasExternalLink = Boolean(project.link);

        return h(
            React.Fragment,
            null,
            h('div', { className: 'featured-label' }, 'Projeto em destaque'),
            h(
                'div',
                {
                    className: 'portfolio-item portfolio-item--featured',
                    'data-id': project.id,
                    'data-github': 'true'
                },
                h(
                    'div',
                    { className: 'portfolio-content' },
                    h(
                        'div',
                        { className: 'featured-header' },
                        h('h3', null, project.title),
                        h(
                            'div',
                            { className: 'featured-meta' },
                            h(
                                'span',
                                { className: 'stars' },
                                h('i', { className: 'fas fa-star' }),
                                ' ',
                                String(project.stars ?? 0)
                            ),
                            updatedLabel ? h('span', { className: 'updated' }, updatedLabel) : null
                        )
                    ),
                    h('p', null, project.description),
                    h(ProjectTags, { tags: tags }),
                    h(
                        'div',
                        { className: 'portfolio-links' },
                        hasExternalLink
                            ? h(
                                'a',
                                {
                                    href: project.link,
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                    className: 'portfolio-link'
                                },
                                h('i', { className: 'fas fa-external-link-alt' }),
                                ' Ver Projeto'
                            )
                            : null,
                        h(
                            'a',
                            {
                                href: project.github,
                                target: '_blank',
                                rel: 'noopener noreferrer',
                                className: 'portfolio-link'
                            },
                            h('i', { className: 'fab fa-github' }),
                            ' Código'
                        )
                    )
                )
            )
        );
    }

    function Loading() {
        return h(
            'div',
            { className: 'loading-indicator' },
            h('div', { className: 'loading-spinner' }),
            h('p', null, 'Carregando projetos do GitHub...')
        );
    }

    function WorkApp() {
        const useEffect = React.useEffect;
        const useMemo = React.useMemo;
        const useState = React.useState;

        const [repos, setRepos] = useState([]);
        const [loading, setLoading] = useState(true);
        const [refreshKey, setRefreshKey] = useState(0);

        useEffect(() => {
            window.__workReactRefresh = function () {
                setRefreshKey((k) => k + 1);
            };
            return () => {
                try { delete window.__workReactRefresh; } catch (_) { /* noop */ }
            };
        }, []);

        useEffect(() => {
            let cancelled = false;

            async function run() {
                setLoading(true);

                try {
                    if (typeof window.fetchGitHubRepos !== 'function') {
                        throw new Error('fetchGitHubRepos não está disponível');
                    }

                    const data = await window.fetchGitHubRepos();
                    if (cancelled) return;

                    setRepos(Array.isArray(data) ? data : []);
                } catch (err) {
                    console.error('❌ React Work: erro ao carregar repos', err);
                    if (typeof window.showNotification === 'function') {
                        window.showNotification('Erro ao carregar projetos do GitHub.', 'error');
                    }
                    if (!cancelled) setRepos([]);
                } finally {
                    if (!cancelled) setLoading(false);
                }
            }

            run();
            return () => {
                cancelled = true;
            };
        }, [refreshKey]);

        const featured = useMemo(() => {
            if (typeof window.pickFeaturedRepo === 'function') {
                return window.pickFeaturedRepo(repos);
            }
            // Fallback: best-effort based on topics
            return repos.find((r) => safeArray(r && r.topics).some((t) => String(t).toLowerCase() === 'featured')) || null;
        }, [repos]);

        const gridRepos = useMemo(() => {
            if (!featured) return repos;
            return repos.filter((r) => r && r.github !== featured.github);
        }, [repos, featured]);

        return h(
            React.Fragment,
            null,
            h('div', { className: 'featured-project', id: 'featuredProject' }, h(FeaturedProject, { project: featured })),
            h(
                'div',
                { className: 'portfolio-grid', id: 'portfolioGrid' },
                loading ? h(Loading, null) : gridRepos.map((p) => h(ProjectCard, { key: String(p.id), project: p }))
            )
        );
    }

    function mount() {
        if (!isWorkPage() || !hasReact()) return;

        const rootEl = document.getElementById('workReactRoot');
        if (!rootEl) return;

        const root = ReactDOM.createRoot(rootEl);
        root.render(h(WorkApp, null));

        // Hook up existing "sync" button (if present) to refresh the React view
        const syncBtn = document.getElementById('syncGitHubBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', function () {
                if (typeof window.__workReactRefresh === 'function') {
                    window.__workReactRefresh();
                }
            });
        }
    }

    document.addEventListener('DOMContentLoaded', mount);
})();
