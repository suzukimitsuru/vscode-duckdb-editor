import * as vscode from 'vscode';
import { Db } from './codeDb';

export class DuckDBEditorProvider implements vscode.CustomReadonlyEditorProvider {
    public static readonly viewType = 'duckdbEditor.duckdb';

    constructor(private readonly context: vscode.ExtensionContext) {}

    public async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        _token: vscode.CancellationToken
    ): Promise<vscode.CustomDocument> {
        return {
            uri,
            dispose: () => {}
        };
    }

    public async resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };

        webviewPanel.webview.html = this.getWebviewContent();

        const db = new Db(document.uri.fsPath);

        const updateWebview = () => {
            webviewPanel.webview.postMessage({
                type: 'update',
                dbPath: document.uri.fsPath
            });
        };

        webviewPanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'query':
                        try {
                            const results = await this.executeQuery(db, message.sql);
                            webviewPanel.webview.postMessage({
                                type: 'queryResult',
                                results: results
                            });
                        } catch (error) {
                            webviewPanel.webview.postMessage({
                                type: 'queryError',
                                error: error instanceof Error ? error.message : String(error)
                            });
                        }
                        break;
                    case 'getTables':
                        try {
                            const tables = await this.getTables(db);
                            webviewPanel.webview.postMessage({
                                type: 'tablesResult',
                                tables: tables
                            });
                        } catch (error) {
                            webviewPanel.webview.postMessage({
                                type: 'tablesError',
                                error: error instanceof Error ? error.message : String(error)
                            });
                        }
                        break;
                }
            },
            null,
            this.context.subscriptions
        );

        // バイナリファイルなので変更監視は不要

        webviewPanel.onDidDispose(() => {
            db.dispose();
        });

        updateWebview();
    }

    private async executeQuery(db: Db, sql: string): Promise<any> {
        return new Promise((resolve, reject) => {
            (db as any)._conn.prepare(sql).all((err: Error | null, result: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    private async getTables(db: Db): Promise<string[]> {
        return new Promise((resolve, reject) => {
            (db as any)._conn.prepare("SHOW TABLES").all((err: Error | null, result: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result.map((row: any) => row.name));
                }
            });
        });
    }

    private getWebviewContent(): string {
        return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DuckDB Editor</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .query-section {
            margin-bottom: 20px;
        }
        
        .query-input {
            width: 100%;
            height: 100px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 10px;
            font-family: var(--vscode-editor-font-family);
            font-size: 14px;
            resize: vertical;
        }
        
        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            margin: 10px 5px 10px 0;
            cursor: pointer;
            border-radius: 3px;
        }
        
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .results-section {
            margin-top: 20px;
        }
        
        .table {
            border-collapse: collapse;
            width: 100%;
            background-color: var(--vscode-editor-background);
        }
        
        .table th,
        .table td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px;
            text-align: left;
        }
        
        .table th {
            background-color: var(--vscode-list-hoverBackground);
            font-weight: bold;
        }
        
        .error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            padding: 10px;
            border-radius: 3px;
            margin: 10px 0;
        }
        
        .tables-list {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            padding: 15px;
            border-radius: 3px;
            margin-bottom: 20px;
        }
        
        .table-item {
            padding: 5px;
            cursor: pointer;
            border-radius: 3px;
        }
        
        .table-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="tables-list">
            <button class="button" onclick="loadTables()">テーブル更新</button>
            <div id="tablesList"></div>
        </div>
        
        <div class="query-section">
            <textarea id="queryInput" class="query-input" placeholder="SELECT * FROM table_name;"></textarea>
            <br>
            <button class="button" onclick="executeQuery()">実行</button>
            <button class="button" onclick="clearQuery()">クリア</button>
        </div>
        
        <div class="results-section">
            <div id="results"></div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function executeQuery() {
            const queryInput = document.getElementById('queryInput');
            const sql = queryInput.value.trim();
            
            if (!sql) {
                showError('SQLクエリを入力してください。');
                return;
            }
            
            vscode.postMessage({
                type: 'query',
                sql: sql
            });
        }
        
        function clearQuery() {
            document.getElementById('queryInput').value = '';
            document.getElementById('results').innerHTML = '';
        }
        
        function loadTables() {
            vscode.postMessage({
                type: 'getTables'
            });
        }
        
        function selectFromTable(tableName) {
            document.getElementById('queryInput').value = 'SELECT * FROM ' + tableName + ';';
        }
        
        function showError(message) {
            document.getElementById('results').innerHTML = 
                '<div class="error">エラー: ' + message + '</div>';
        }
        
        function displayResults(results) {
            const resultsDiv = document.getElementById('results');
            
            if (!results || results.length === 0) {
                resultsDiv.innerHTML = '<p>結果がありません。</p>';
                return;
            }
            
            const keys = Object.keys(results[0]);
            let html = '<table class="table"><thead><tr>';
            
            keys.forEach(key => {
                html += '<th>' + key + '</th>';
            });
            
            html += '</tr></thead><tbody>';
            
            results.forEach(row => {
                html += '<tr>';
                keys.forEach(key => {
                    const value = row[key];
                    html += '<td>' + (value !== null && value !== undefined ? value : 'NULL') + '</td>';
                });
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            resultsDiv.innerHTML = html;
        }
        
        function displayTables(tables) {
            const tablesDiv = document.getElementById('tablesList');
            
            if (!tables || tables.length === 0) {
                tablesDiv.innerHTML = '<p>テーブルが見つかりません。</p>';
                return;
            }
            
            let html = '';
            tables.forEach(table => {
                html += '<div class="table-item" onclick="selectFromTable(\\\'' + table + '\\\')">' + table + '</div>';
            });
            
            tablesDiv.innerHTML = html;
        }
        
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'queryResult':
                    displayResults(message.results);
                    break;
                case 'queryError':
                    showError(message.error);
                    break;
                case 'tablesResult':
                    displayTables(message.tables);
                    break;
                case 'tablesError':
                    showError('テーブル取得エラー: ' + message.error);
                    break;
                case 'update':
                    loadTables();
                    break;
            }
        });
        
        // 初期読み込み
        loadTables();
    </script>
</body>
</html>`;
    }
}