"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MVSchema = exports.UDTSchema = exports.Schema = exports.FrozenType = void 0;
class FrozenType {
    constructor(udt) {
        this.udt = udt;
    }
}
exports.FrozenType = FrozenType;
class Schema {
    constructor(definition, options) {
        this.definition = definition;
        this.options = options;
    }
}
exports.Schema = Schema;
;
class UDTSchema {
    constructor(definition) {
        this.definition = definition;
    }
    ;
}
exports.UDTSchema = UDTSchema;
class MVSchema {
    constructor(definition) {
        this.definition = definition;
    }
    ;
}
exports.MVSchema = MVSchema;
