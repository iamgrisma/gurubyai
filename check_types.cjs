const ts = require('typescript');
const path = require('path');
const fs = require('fs');

function checkProject(projectDir) {
    const configPath = ts.findConfigFile(projectDir, ts.sys.fileExists, 'tsconfig.json');
    if (!configPath) {
        console.error("Could not find a valid 'tsconfig.json'.");
        return;
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));

    const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
    const emitResult = program.emit();

    const allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

    let errorCount = 0;
    
    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            // Ignore node_modules
            if (diagnostic.file.fileName.includes('node_modules')) return;
            
            // Ignore missing module errors (Cannot find module 'react' etc)
            // TS2307: Cannot find module 'X' or its corresponding type declarations.
            // TS2792: Cannot find module 'X'. Did you mean to set the 'moduleResolution' option to 'node', or to add aliases to the 'paths' option?
            if (diagnostic.code === 2307 || diagnostic.code === 2792) return;
            
            // Ignore "cannot use JSX unless the '--jsx' flag is provided" since it might happen if tsconfig is misread
            if (diagnostic.code === 17004) return;

            let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(`[TS${diagnostic.code}] ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
            errorCount++;
        }
    });
    
    console.log(`\nFound ${errorCount} local type errors.`);
}

checkProject(process.cwd());
