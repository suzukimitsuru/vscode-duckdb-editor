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

        webviewPanel.webview.html = this.getWebviewContent(webviewPanel.webview);

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

    private getWebviewContent(webview: vscode.Webview): string {
        const mediaPath = vscode.Uri.joinPath(this.context.extensionUri, 'media');
        const codiconCssUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'codicon.css'));
        const codiconFontUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'codicon.ttf'));
        
        return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DuckDB Editor</title>
    <link href="${codiconCssUri}" rel="stylesheet">
    <style>
        @font-face {
            font-family: "codicon";
            font-display: block;
            src: url("${codiconFontUri}") format("truetype");
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
        }
        
        .container {
            height: 100vh;
            max-width: none;
            margin: 0;
        }
        
        .main-content {
            padding: 20px;
            overflow: auto;
            height: 100vh;
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
        
        .tables-container {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .query-container {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .query-buttons {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .pagination-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
        }
        
        .pagination-buttons {
            display: flex;
            gap: 5px;
        }
        
        .results-container {
            max-height: 400px;
            overflow: auto;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
        }
        
        .icon-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px;
            cursor: pointer;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
        }
        
        .icon-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .icon-button .codicon {
            font-size: 14px;
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
            white-space: nowrap;
        }
        
        .table th {
            background-color: var(--vscode-list-hoverBackground);
            font-weight: bold;
            position: sticky;
            top: 0;
            z-index: 1;
        }
        
        select {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 4px 8px;
            border-radius: 3px;
        }
        
        .error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            padding: 10px;
            border-radius: 3px;
            margin: 10px 0;
        }
        
        .tables-list {
            background-color: var(--vscode-editor-background);
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
        <div class="main-content">
            <div class="tables-section">
                <div class="tables-container">
                    <button class="icon-button" onclick="loadTables()" title="更新">
                        <i class="codicon codicon-refresh"></i>
                    </button>
                    <div id="tablesList" class="tables-list"></div>
                </div>
            </div>
            
            <div class="query-section">
                <div class="query-container">
                    <div class="query-buttons">
                        <button class="icon-button" onclick="executeQuery()" title="実行">
                            <i class="codicon codicon-play"></i>
                        </button>
                        <button class="icon-button" onclick="clearQuery()" title="クリア">
                            <i class="codicon codicon-clear-all"></i>
                        </button>
                    </div>
                    <textarea id="queryInput" class="query-input" placeholder="SELECT * FROM table_name;"></textarea>
                </div>
            </div>
            
            <div class="results-section">
                <div class="pagination-controls">
                    <select id="pageSize" onchange="changePageSize()">
                        <option value="10">10件</option>
                        <option value="25" selected>25件</option>
                        <option value="50">50件</option>
                        <option value="100">100件</option>
                    </select>
                    <div class="pagination-info">
                        <span id="paginationInfo"></span>
                    </div>
                    <div class="pagination-buttons">
                        <button class="icon-button" onclick="previousPage()" id="prevBtn" title="前のページ">
                            <i class="codicon codicon-chevron-left"></i>
                        </button>
                        <button class="icon-button" onclick="nextPage()" id="nextBtn" title="次のページ">
                            <i class="codicon codicon-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div id="results" class="results-container"></div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        let currentResults = [];
        let currentPage = 1;
        let pageSize = 25;
        
        function executeQuery() {
            const queryInput = document.getElementById('queryInput');
            const sql = queryInput.value.trim();
            
            if (!sql) {
                showError('SQLクエリを入力してください。');
                return;
            }
            
            currentPage = 1;
            vscode.postMessage({
                type: 'query',
                sql: sql
            });
        }
        
        function clearQuery() {
            document.getElementById('queryInput').value = '';
            document.getElementById('results').innerHTML = '';
            document.getElementById('paginationInfo').innerHTML = '';
            currentResults = [];
            currentPage = 1;
        }
        
        function changePageSize() {
            const select = document.getElementById('pageSize');
            pageSize = parseInt(select.value);
            currentPage = 1;
            displayResults(currentResults);
        }
        
        function previousPage() {
            if (currentPage > 1) {
                currentPage--;
                displayResults(currentResults);
            }
        }
        
        function nextPage() {
            const totalPages = Math.ceil(currentResults.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                displayResults(currentResults);
            }
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
            currentResults = results || [];
            const resultsDiv = document.getElementById('results');
            const paginationInfo = document.getElementById('paginationInfo');
            
            if (!results || results.length === 0) {
                resultsDiv.innerHTML = '<p>結果がありません。</p>';
                paginationInfo.innerHTML = '';
                updatePaginationButtons();
                return;
            }
            
            const totalRecords = results.length;
            const totalPages = Math.ceil(totalRecords / pageSize);
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, totalRecords);
            const pageResults = results.slice(startIndex, endIndex);
            
            const keys = Object.keys(results[0]);
            let html = '<table class="table"><thead><tr>';
            
            keys.forEach(key => {
                html += '<th>' + key + '</th>';
            });
            
            html += '</tr></thead><tbody>';
            
            pageResults.forEach(row => {
                html += '<tr>';
                keys.forEach(key => {
                    const value = row[key];
                    html += '<td>' + (value !== null && value !== undefined ? value : 'NULL') + '</td>';
                });
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            resultsDiv.innerHTML = html;
            
            // ページング情報を更新
            paginationInfo.innerHTML = totalRecords + '件中 ' + (startIndex + 1) + '-' + endIndex + '件 (ページ ' + currentPage + '/' + totalPages + ')';
            updatePaginationButtons();
        }
        
        function updatePaginationButtons() {
            const totalPages = Math.ceil(currentResults.length / pageSize);
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = currentPage >= totalPages;
            
            if (prevBtn.disabled) {
                prevBtn.style.opacity = '0.5';
                prevBtn.style.cursor = 'not-allowed';
            } else {
                prevBtn.style.opacity = '1';
                prevBtn.style.cursor = 'pointer';
            }
            
            if (nextBtn.disabled) {
                nextBtn.style.opacity = '0.5';
                nextBtn.style.cursor = 'not-allowed';
            } else {
                nextBtn.style.opacity = '1';
                nextBtn.style.cursor = 'pointer';
            }
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