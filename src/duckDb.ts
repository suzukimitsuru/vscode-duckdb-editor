/** @file DB操作 with DuckDB */
import * as vscode from 'vscode';
import * as path from 'path';

import * as duckdb from 'duckdb';
const dynDuckdb = require(path.join(__dirname, '..', 'bindings', `duckdb-${process.platform}-${process.arch}.node`)) as typeof duckdb;

/** @description データベース操作 */
export class Db extends vscode.Disposable {

    /** @description データベース */
    private _db: duckdb.Database;
    /** @description 接続 */
    private _conn: duckdb.Connection;
    
    /**
     * @description コンストラクタ
     * @param dbFile データベースファイルのパス
     */
    public constructor(dbFile: string) {
        super(() => {
            this._conn?.close((err?: Error | null) => {});
            this._conn = null as any;
            this._db = null as any;
        });
        this._db = new dynDuckdb.Database(dbFile);
        this._conn = this._db.connect();
    }

    /**
     * @description データベースを破棄する
     */
    public dispose() {
        this._conn.close((err?: Error | null) => {});
        this._conn = null as any;
        this._db = null as any;
        super.dispose();    
    }

    public async listTables(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this._conn.prepare("SHOW TABLES").all((err: Error | null, result: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result.map((row: any) => row.name));
                }
            });
        });
    }

    public async executeQuery(sql: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this._conn.prepare(sql).all((err: Error | null, result: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
}
