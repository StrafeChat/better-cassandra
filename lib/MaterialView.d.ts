import { Client } from "./Client";
export interface MaterialViewOptions<T> {
    tableName: string;
    columns: {
        name: keyof T;
        primary?: boolean;
    }[];
    include?: (keyof T)[];
}
export declare class MaterialView<T> {
    readonly name: string;
    readonly options: MaterialViewOptions<T>;
    client: Client;
    constructor(name: string, options: MaterialViewOptions<T>);
    load(client: Client): Promise<void>;
}
