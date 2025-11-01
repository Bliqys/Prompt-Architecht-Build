# Contributing to Prompt Architect

Thank you for your interest in contributing! This document provides guidelines for contributing to Prompt Architect.

## 🎯 Project Philosophy

Prompt Architect is an enterprise-grade RAG-powered prompt engineering platform. We prioritize:
- **Quality over speed**: Well-crafted prompts that work consistently
- **User experience**: Simple, intuitive interface for complex AI workflows
- **Security**: Enterprise-grade data protection and RLS policies
- **Open source**: Community-driven development and transparency

## 🚀 Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/prompt-architect.git
   cd prompt-architect
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up Supabase** (see DEPLOYMENT_GUIDE.md):
   - Create a Supabase project
   - Run migrations
   - Configure environment variables
   - Deploy edge functions

5. **Start development server**:
   ```bash
   npm run dev
   ```

## 🛠️ Development Workflow

### Branch Naming
- `feature/` - New features (e.g., `feature/pdf-upload`)
- `fix/` - Bug fixes (e.g., `fix/quality-score-calculation`)
- `docs/` - Documentation updates
- `refactor/` - Code refactoring without behavior changes

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add PDF upload support to knowledge base
fix: correct RAG retrieval token limit
docs: update deployment guide for Vercel
refactor: extract prompt generation logic to separate function
```

### Pull Request Process

1. **Create a descriptive PR**:
   - Clear title following commit conventions
   - Description of what changed and why
   - Screenshots/videos for UI changes
   - Reference related issues

2. **Ensure quality**:
   - Code follows existing patterns
   - No console errors or warnings
   - TypeScript types are properly defined
   - RLS policies maintain security

3. **Testing checklist**:
   - [ ] UI works in light/dark mode
   - [ ] Mobile responsive (test on small screens)
   - [ ] Authentication flows work correctly
   - [ ] RLS policies properly restrict data access
   - [ ] Edge functions return proper errors
   - [ ] Quality scores calculate correctly

4. **Wait for review**:
   - Maintainers will review within 3-5 days
   - Address feedback promptly
   - Be open to discussion and iteration

## 📝 Code Style

### TypeScript/React
- Use functional components with hooks
- Prefer `const` over `let`, avoid `var`
- Use TypeScript types, avoid `any`
- Destructure props and state
- Use meaningful variable names

```typescript
// ✅ Good
const { user, session } = useAuth();
const [isGenerating, setIsGenerating] = useState(false);

// ❌ Avoid
let x = useAuth();
const [flag, setFlag] = useState(false);
```

### Tailwind CSS
- Use semantic tokens from `index.css`
- Avoid hardcoded colors (use design system)
- Mobile-first responsive design
- Use existing UI components from `/components/ui`

```tsx
// ✅ Good
<Button variant="default" size="lg" className="w-full">
  Generate Prompt
</Button>

// ❌ Avoid
<button className="bg-blue-500 text-white px-4 py-2 rounded">
  Generate Prompt
</button>
```

### Supabase Edge Functions
- Use TypeScript
- Include proper CORS headers
- Add comprehensive error handling
- Log important events for debugging
- Use service role key for privileged operations
- Never expose secrets to client

```typescript
// ✅ Good
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ❌ Avoid - don't use anon key for server operations
const supabase = createClient(url, anonKey);
```

## 🎨 Design Guidelines

- **Consistency**: Match existing UI patterns
- **Accessibility**: Proper labels, ARIA attributes, keyboard navigation
- **Responsive**: Test on mobile (375px) and desktop (1920px)
- **Dark mode**: All new components must support dark mode
- **Loading states**: Show feedback during async operations
- **Error states**: User-friendly error messages

## 🔒 Security Requirements

**CRITICAL**: All contributions must maintain security standards:

1. **Row Level Security (RLS)**:
   - All tables must have RLS enabled
   - Policies must use `auth.uid()` for user isolation
   - Never bypass RLS in client code

2. **Input Validation**:
   - Validate all user input with Zod schemas
   - Sanitize before database operations
   - Use parameterized queries (Supabase client handles this)

3. **Authentication**:
   - Never expose service role keys to client
   - Use session tokens for user operations
   - Implement proper JWT verification in edge functions

4. **Secrets Management**:
   - Store API keys in Supabase secrets
   - Never commit secrets to repository
   - Use environment variables properly

## 🐛 Reporting Issues

### Bug Reports
Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if applicable
- Browser/OS information
- Console errors or logs

### Feature Requests
Include:
- Problem you're trying to solve
- Proposed solution
- Alternative solutions considered
- Willingness to contribute implementation

## 📚 Documentation

When adding features:
- Update README.md if user-facing
- Update DEPLOYMENT_GUIDE.md if deployment-related
- Update USAGE_GUIDE.md if workflow-related
- Add inline code comments for complex logic
- Update TypeScript types

## 🤝 Community Guidelines

- **Be respectful**: Treat everyone with kindness and respect
- **Be patient**: Maintainers are volunteers
- **Be constructive**: Provide helpful feedback
- **Be collaborative**: We're building together
- **Be inclusive**: Welcome developers of all skill levels

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🎓 Learning Resources

New to the stack? Check out:
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)

## ❓ Questions?

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community support
- **Pull Requests**: For code contributions

---

Thank you for contributing to Prompt Architect! 🚀
