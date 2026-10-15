/** @file DB操作 with DuckDB */
import * as vscode from 'vscode';
import { DuckDBConnection, DuckDBInstance, Json } from '@duckdb/node-api';

/** @description 問い合わせ結果の1行 (列名 → JSON の値。BIGINT・DECIMAL・日時などは文字列) */
export type Row = Record<string, Json>;

/** @description データベース操作 */
export class Db extends vscode.Disposable {

    /** @description 接続 (開き終わるまでは開く処理) */
    private readonly _connecting: Promise<DuckDBConnection>;
    /** @description 直前の問い合わせ (問い合わせを呼んだ順に1つずつ実行する) */
    private _last: Promise<unknown> = Promise.resolve();
    /** @description 破棄済み */
    private _disposed = false;

    /**
     * @description コンストラクタ
     * @param dbFile データベースファイルのパス
     * @description 開く処理は非同期に進め、最初の問い合わせで完了を待つ。開けなかった場合は最初の問い合わせが失敗する
     */
    public constructor(dbFile: string) {
        super(() => this._close());
        this._connecting = (async () => {
            // 同じファイルを複数のエディタで開いても衝突しないよう、インスタンスキャッシュから開く。
            // キャッシュのインスタンスは他のエディタと共有するため閉じない
            const instance = await DuckDBInstance.fromCache(dbFile);
            return instance.connect();
        })();
        this._connecting.catch(() => {});
    }

    /**
     * @description データベースを破棄する
     */
    public dispose() {
        this._close();
        super.dispose();
    }

    /**
     * @description 接続を閉じる (2回目以降は何もしない)
     */
    private _close(): void {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        void this._last.catch(() => {}).then(() => this._connecting).then(connection => {
            connection.closeSync();
        }).catch(() => {});
    }

    /**
     * @description 問い合わせを、それまでに呼ばれた問い合わせの後に実行する
     * @param query 問い合わせ
     * @returns 問い合わせの結果
     * @description DuckDB の接続は並行に呼ぶと実行順が保証されないため、呼んだ順に1つずつ実行する
     */
    private _enqueue<T>(query: (connection: DuckDBConnection) => Promise<T>): Promise<T> {
        const result = this._last.catch(() => {}).then(async () => query(await this._connecting));
        this._last = result;
        return result;
    }

    /**
     * @description SQL を実行して全ての行を読む
     * @param sql SQL (複数の文を ; で区切って書ける)
     * @returns 最後の文の行の配列 (Webview へそのまま送れる JSON の値)
     * @description 複数の文は前から順に実行し、最後の文の結果を返す
     */
    private _all(sql: string): Promise<Row[]> {
        return this._enqueue(async connection => {
            const statements = await connection.extractStatements(sql);
            let rows: Row[] = [];
            for (let index = 0; index < statements.count; index++) {
                const prepared = await statements.prepare(index);
                const reader = await prepared.runAndReadAll();
                rows = reader.getRowObjectsJson() as Row[];
            }
            return rows;
        });
    }

    public async listTables(): Promise<string[]> {
        const rows = await this._all('SHOW TABLES');
        return rows.map(row => String(row.name));
    }

    public async executeQuery(sql: string): Promise<Row[]> {
        return this._all(sql);
    }
}
