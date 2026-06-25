const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // Replace react-router-dom imports
            if (content.includes('react-router-dom')) {
                content = content.replace(/import\s*\{(.*?)\}\s*from\s*['"]react-router-dom['"];?/g, (match, imports) => {
                    let nextImports = [];
                    let navImports = [];
                    
                    if (imports.includes('Link')) {
                        nextImports.push('import Link from "next/link";');
                    }
                    if (imports.includes('useNavigate')) {
                        navImports.push('useRouter');
                    }
                    if (imports.includes('useLocation')) {
                        navImports.push('usePathname');
                        navImports.push('useSearchParams');
                    }
                    if (imports.includes('useParams')) {
                        navImports.push('useParams');
                    }
                    if (imports.includes('Navigate')) {
                        navImports.push('redirect');
                    }
                    if (imports.includes('Outlet')) {
                         // Next.js doesn't use Outlet, but we can just remove it or replace it with children if in a layout
                    }
                    
                    let res = nextImports.join('\n');
                    if (navImports.length > 0) {
                        res += `\nimport { ${navImports.join(', ')} } from "next/navigation";`;
                    }
                    return res;
                });
                
                // Replace usage
                content = content.replace(/const\s+navigate\s*=\s*useNavigate\(\)/g, 'const router = useRouter()');
                content = content.replace(/navigate\(/g, 'router.push(');
                content = content.replace(/const\s+location\s*=\s*useLocation\(\)/g, 'const pathname = usePathname(); const searchParams = useSearchParams();');
                content = content.replace(/<Link\s+to=/g, '<Link href=');
                content = content.replace(/<Navigate\s+to=/g, '<Redirect to=');
            }
            
            // If it uses hooks or browser APIs, ensure 'use client'
            if ((content.includes('useState') || content.includes('useEffect') || content.includes('useRouter') || content.includes('usePathname') || content.includes('useSearchParams') || content.includes('useAuth')) && !content.includes('"use client"')) {
                content = '"use client";\n\n' + content;
            }
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated', fullPath);
            }
        }
    }
}

processDir('./src');
