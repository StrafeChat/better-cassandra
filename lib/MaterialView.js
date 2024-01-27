"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialView = void 0;
class MaterialView {
    constructor(name, options // schema?
    ) {
        this.name = name;
        this.options = options;
    }
    load(client) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const partitionKey = [[], []];
                for (const column of this.options.columns) {
                    if (column.primary)
                        partitionKey[0].push(column.name);
                    else
                        partitionKey[1].push(column.name);
                }
                this.client = client;
                const query = `
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${client.cassandara.keyspace}.${this.name} AS
      SELECT ${this.options.include
                    ? this.options.include.map((col) => col.toString()).join(", ")
                    : "*"} FROM ${client.cassandara.keyspace}.${this.options.tableName}
      WHERE ${this.options.columns
                    .map((key) => `${key.name.toString()} IS NOT NULL`)
                    .join(" AND ")}
      PRIMARY KEY ((${partitionKey[0].map((key) => key).join(", ")}), ${partitionKey[1].map((key) => key).join(", ")});`;
                yield client.cassandara.execute(query);
                client.materialViews.set(this.name, this);
                client.logging.success(`Loaded material view: \`${this.name}\``);
            }
            catch (error) {
                this.client.logging.error(`Error creating materialized view ${this.name}: ${error}`);
            }
        });
    }
}
exports.MaterialView = MaterialView;
