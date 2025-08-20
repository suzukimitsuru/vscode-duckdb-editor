import * as vscode from 'vscode';
import { DuckDBEditorProvider } from './duckdbEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new DuckDBEditorProvider(context);
    
    const providerRegistration = vscode.window.registerCustomEditorProvider(
        DuckDBEditorProvider.viewType, 
        provider,
        {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        }
    );
    
    context.subscriptions.push(providerRegistration);
}

export function deactivate() {}