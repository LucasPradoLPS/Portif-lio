# 🚀 Portfólio Pessoal em JavaScript

Um portfólio moderno, responsivo e interativo para desenvolvedores, criado com HTML5, CSS3 e JavaScript puro.

## 🌟 Características

### ✨ Design Moderno
- **Layout responsivo** que se adapta a todas as telas
- **Gradientes coloridos** e efeitos visuais atraentes
- **Animações suaves** e interações intuitivas
- **Tipografia moderna** usando Google Fonts (Poppins)

### 🔧 Funcionalidades
- **Navegação suave** entre seções
- **Sistema de filtros** para projetos por categoria
- **Adicionar/remover projetos** dinamicamente
- **Formulário de contato** funcional
- **Menu mobile** responsivo
- **Barras de progresso** animadas para habilidades
- **Modal interativo** para adicionar novos projetos

### 📱 Responsividade
- Design mobile-first
- Breakpoints otimizados para tablets e desktops
- Menu hamburger para dispositivos móveis

## 🚀 Como Usar

### 1. Abertura do Portfólio
Simplesmente abra o arquivo `index.html` no seu navegador preferido.

### 2. Personalizando Suas Informações

#### **Informações Pessoais (index.html)**
Edite as seguintes seções:

```html
<!-- Nome e título -->
<h1 class="home-title">
    Olá, eu sou <span class="highlight">Seu Nome</span>
</h1>
<h2 class="home-subtitle">Seu Cargo/Especialidade</h2>

<!-- Descrição pessoal -->
<p class="home-description">
    Sua descrição profissional aqui...
</p>
```

#### **Foto de Perfil**
Substitua a URL da imagem na seção home:

```html
<img src="caminho/para/sua-foto.jpg" alt="Profile" class="profile-img">
```

#### **Informações de Contato**
Atualize os dados na seção de contato:

```html
<p>seu.email@example.com</p>
<p>+55 (11) 99999-9999</p>
<p>Sua Cidade, Estado</p>
```

#### **Links Sociais**
Adicione seus links nas redes sociais no footer:

```html
<a href="https://github.com/seuusuario" class="social-link">
    <i class="fab fa-github"></i>
</a>
```

### 3. Adicionando Seus Projetos

Você pode adicionar projetos de duas maneiras:

#### **Método 1: Via Interface (Recomendado)**
1. Clique no botão "Adicionar Projeto" na seção Portfólio
2. Preencha o formulário com:
   - Título do projeto
   - Descrição
   - Categoria (Web, Mobile, Design)
   - URL da imagem
   - Link do projeto
   - Link do GitHub (opcional)
3. Clique em "Adicionar Projeto"

#### **Método 2: Via Código JavaScript**
Edite o arquivo `script.js` na função `loadSampleProjects()`:

```javascript
const sampleProjects = [
    {
        id: 1,
        title: "Meu Projeto Incrível",
        description: "Descrição do projeto...",
        category: "web", // web, mobile, ou design
        image: "url-da-imagem.jpg",
        link: "https://meu-projeto.com",
        github: "https://github.com/usuario/projeto"
    }
];
```

### 4. Personalizando Habilidades

Edite a seção de habilidades no `index.html`:

```html
<div class="skill-card">
    <div class="skill-icon">
        <i class="fab fa-python"></i> <!-- Ícone da tecnologia -->
    </div>
    <h3>Python</h3>
    <div class="skill-bar">
        <div class="skill-progress" data-width="85%"></div> <!-- Nível de habilidade -->
    </div>
</div>
```

### 5. Customizando Cores

Edite as variáveis CSS no arquivo `styles.css`:

```css
:root {
    --primary-color: #667eea;    /* Cor primária */
    --secondary-color: #764ba2;  /* Cor secundária */
    --accent-color: #f093fb;     /* Cor de destaque */
    --text-color: #333;          /* Cor do texto */
    --bg-light: #f8f9fa;         /* Fundo claro */
}
```

## 📁 Estrutura dos Arquivos

```
portifolio/
├── index.html      # Estrutura HTML principal
├── styles.css      # Estilos CSS e animações
├── script.js       # Funcionalidades JavaScript
└── README.md       # Documentação (este arquivo)
```

## 🎨 Seções do Portfólio

### 🏠 **Início (Home)**
- Apresentação pessoal
- Call-to-action buttons
- Foto de perfil animada

### 👨‍💻 **Sobre Mim**
- Descrição profissional
- Estatísticas pessoais
- Imagem complementar

### 🛠️ **Habilidades**
- Tecnologias que você domina
- Barras de progresso animadas
- Ícones das tecnologias

### 💼 **Portfólio**
- Grid de projetos
- Filtros por categoria
- Sistema para adicionar/remover projetos
- Links para projetos e GitHub

### 📞 **Contato**
- Informações de contato
- Formulário funcional
- Ícones e links

## 🔧 Funcionalidades Avançadas

### **Sistema de Filtros**
Os projetos podem ser filtrados por categorias:
- `all` - Todos os projetos
- `web` - Projetos web
- `mobile` - Aplicações móveis  
- `design` - Projetos de design

### **Armazenamento Local**
Os projetos adicionados são salvos no localStorage do navegador, mantendo seus dados mesmo após fechar a página.

### **Animações e Interações**
- Scroll suave entre seções
- Animações de entrada (fade-in)
- Hover effects nos elementos
- Loading animations nas habilidades

### **Responsividade Completa**
- Menu hamburger para mobile
- Layout adaptativo
- Imagens responsivas
- Touch-friendly interface

## 🚀 Dicas de Personalização

### **Adicionando Novas Seções**
Para adicionar uma nova seção:

1. Adicione no HTML:
```html
<section id="nova-secao" class="nova-secao">
    <div class="container">
        <!-- Conteúdo da seção -->
    </div>
</section>
```

2. Adicione no menu de navegação:
```html
<li class="nav-item">
    <a href="#nova-secao" class="nav-link">Nova Seção</a>
</li>
```

3. Adicione estilos no CSS conforme necessário.

### **Mudando Fontes**
Para usar outra fonte, substitua no `<head>` do HTML:

```html
<link href="https://fonts.googleapis.com/css2?family=SuaFonte:wght@300;400;600;700&display=swap" rel="stylesheet">
```

E no CSS:
```css
body {
    font-family: 'SuaFonte', sans-serif;
}
```

### **Adicionando Mais Animações**
Use as classes CSS existentes:
- `.fade-in` - Animação de entrada
- `.visible` - Classe ativada quando elemento é visível

### **Integrações Possíveis**
- **Formulário de contato**: Integrar com EmailJS ou Netlify Forms
- **Analytics**: Adicionar Google Analytics
- **PWA**: Converter em Progressive Web App
- **CMS**: Integrar com headless CMS

## 🌐 Hospedagem

### **GitHub Pages (Gratuito)**
1. Crie um repositório no GitHub
2. Faça upload dos arquivos
3. Ative GitHub Pages nas configurações
4. Acesse via: `https://seuusuario.github.io/nome-do-repositorio`

### **Netlify (Gratuito)**
1. Conecte seu repositório GitHub
2. Deploy automático a cada commit
3. Domínio personalizado disponível

### **Vercel (Gratuito)**
1. Import do GitHub
2. Deploy automático
3. Excelente performance

## 🆘 Suporte e Problemas Comuns

### **Imagens não carregam**
- Verifique se as URLs das imagens estão corretas
- Use URLs completas (https://)
- Considere usar placeholder services para testes

### **Animações não funcionam**
- Verifique se o JavaScript está carregando
- Abra o console do navegador (F12) para ver erros
- Certifique-se que os seletores CSS estão corretos

### **Menu mobile não abre**
- Verifique se o arquivo JavaScript está linkado corretamente
- Confirme se não há erros no console

### **Formulário não funciona**
- O formulário atual é apenas visual
- Para funcionalidade real, integre com um serviço de backend
- Considere usar EmailJS para emails sem backend

## 📝 Licença

Este projeto é de código aberto. Sinta-se livre para usar, modificar e distribuir conforme necessário.

## 🤝 Contribuições

Sugestões e melhorias são sempre bem-vindas! 

---

**🎉 Parabéns!** Seu portfólio está pronto para impressionar. Não esqueça de personalizar com suas informações e projetos reais!