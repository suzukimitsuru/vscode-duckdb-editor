import * as vscode from 'vscode';
import { DbEditorProvider } from './dbEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new DbEditorProvider(context);
    
    const providerRegistration = vscode.window.registerCustomEditorProvider(
        DbEditorProvider.viewType, 
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