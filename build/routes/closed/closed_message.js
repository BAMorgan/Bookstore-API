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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.libraryRouter = void 0;
//express is the framework we're going to use to handle requests
const express_1 = __importDefault(require("express"));
//Access the connection to Postgres Database
const utilities_1 = require("../../core/utilities");
const libraryRouter = express_1.default.Router();
exports.libraryRouter = libraryRouter;
const format = (resultRow) => (Object.assign(Object.assign({}, resultRow), { formatted: `{${resultRow.priority}} - [${resultRow.name}] says: ${resultRow.message}` }));
const isStringProvided = utilities_1.validationFunctions.isStringProvided;
const isNumberProvided = utilities_1.validationFunctions.isNumberProvided;
/**
 * @apiDefine JWT
 * @apiHeader {String} Authorization The string "Bearer " + a valid JSON Web Token (JWT).
 */
/**
 * @api {get} /c/library/offset Request to retrieve entries by offset pagination
 *
 * @apiDescription Request to retrieve paginated the entries using an entry limit and offset.
 *
 * @apiName Messages Offset Pagination
 * @apiGroup Pagination Examples
 *
 * @apiUse JWT
 *
 * @apiQuery {number} limit the number of entry objects to return. Note, if a value less than
 * 0 is provided or a non-numeric value is provided or no value is provided, the default limit
 * amount of 10 will be used.
 *
 * @apiQuery {number} offset the number to offset the lookup of entry objects to return. Note,
 * if a value less than 0 is provided or a non-numeric value is provided or no value is provided,
 * the default offset of 0 will be used.
 *
 * @apiSuccess {Object} pagination metadata results from this paginated query
 * @apiSuccess {number} pagination.totalRecords the most recent count on the total amount of entries. May be stale.
 * @apiSuccess {number} pagination.limit the number of entry objects to returned.
 * @apiSuccess {number} pagination.offset the number used to offset the lookup of entry objects.
 * @apiSuccess {number} pagination.nextPage the offset that should be used on a preceding call to this route.
 *
 * @apiSuccess {Object[]} entries the message entry objects of all entries
 * @apiSuccess {string} entries.name <code>name</code>
 * @apiSuccess {string} entries.message The message associated with <code>name</code>
 * @apiSuccess {number} entries.priority The priority associated with <code>name</code>
 * @apiSuccess {string} entries.formatted the entry as the following string:
 *      "{<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 *
 */
libraryRouter.get('/offset', (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    const theQuery = `SELECT name, message, priority 
                        FROM Demo 
                        ORDER BY DemoID
                        LIMIT $1
                        OFFSET $2`;
    /*
     * NOTE: Using OFFSET in the query can lead to poor performance on large datasets as
     * the DBMS has to scan all of the results up to the offset to "get" to it.
     * The performance hit is roughly linear [O(n)] in performance. So, if the offset is
     * close to the end of the data set and the dataset has 1000 entries and this query takes
     * 1ms, a dataset with 100,000 entries will take 100ms and 1,000,000 will take 1,000ms or 1s!
     * The times used above are solely used as examples.
     */
    // NOTE: +request.query.limit the + tells TS to treat this string as a number
    const limit = isNumberProvided(request.query.limit) && +request.query.limit > 0
        ? +request.query.limit
        : 10;
    const offset = isNumberProvided(request.query.offset) && +request.query.offset >= 0
        ? +request.query.offset
        : 0;
    const values = [limit, offset];
    // demonstrating deconstructing the returned object. const { rows }
    const { rows } = yield utilities_1.pool.query(theQuery, values);
    // This query is SLOW on large datasets! - Beware!
    const result = yield utilities_1.pool.query('SELECT count(*) AS exact_count FROM demo;');
    const count = result.rows[0].exact_count;
    response.send({
        entries: rows.map(format),
        pagination: {
            totalRecords: count,
            limit,
            offset,
            nextPage: limit + offset,
        },
    });
}));
/**
 * @api {get} /c/library/cursor Request to retrieve entries by cursor pagination
 *
 * @apiDescription Request to retrieve paginated the entries using a cursor.
 *
 * @apiName Messages Cursor Pagination
 * @apiGroup Pagination Examples
 *
 * @apiUse JWT
 *
 * @apiQuery {number} limit the number of entry objects to return. Note, if a value less than
 * 0 is provided or a non-numeric value is provided or no value is provided, the default limit
 * amount of 10 will be used.
 *
 * @apiQuery {number} cursor the value used in the lookup of entry objects to return. When no cursor is
 * provided, the result is the first set of paginated entries.  Note, if a value less than 0 is provided
 * or a non-numeric value is provided results will be the same as not providing a cursor.
 *
 * @apiSuccess {Object} pagination metadata results from this paginated query
 * @apiSuccess {number} pagination.totalRecords the most recent count on the total amount of entries. May be stale.
 * @apiSuccess {number} pagination.limit the number of entry objects to returned.
 * @apiSuccess {number} pagination.cursor the value that should be used on a preceding call to this route.
 *
 * @apiSuccess {Object[]} entries the message entry objects of all entries
 * @apiSuccess {string} entries.name <code>name</code>
 * @apiSuccess {string} entries.message The message associated with <code>name</code>
 * @apiSuccess {number} entries.priority The priority associated with <code>name</code>
 * @apiSuccess {string} entries.formatted the entry as the following string:
 *      "{<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 *
 */
libraryRouter.get('/cursor', (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    const theQuery = `SELECT name, message, priority, DemoID 
                        FROM Demo
                        WHERE DemoID > $2  
                        ORDER BY DemoID
                        LIMIT $1`;
    // NOTE: +request.query.limit the + tells TS to treat this string as a number
    const limit = isNumberProvided(request.query.limit) && +request.query.limit > 0
        ? +request.query.limit
        : 10;
    const cursor = isNumberProvided(request.query.cursor) && +request.query.cursor >= 0
        ? +request.query.cursor
        : 0; // autogenerated ids start at 1 so 0 is a valid starting cursor
    const values = [limit, cursor];
    // demonstrating deconstructing the returned object. const { rows }
    const { rows } = yield utilities_1.pool.query(theQuery, values);
    // This query is SLOW on large datasets! - Beware!
    const result = yield utilities_1.pool.query('SELECT count(*) AS exact_count FROM demo;');
    const count = result.rows[0].exact_count;
    response.send({
        entries: rows.map((_a) => {
            var { demoid } = _a, rest = __rest(_a, ["demoid"]);
            return rest;
        }).map(format), //removes demoid property
        pagination: {
            totalRecords: count,
            limit,
            cursor: rows
                .map((row) => row.demoid) //note the lowercase, the field names for rows are all lc
                .reduce((max, id) => (id > max ? id : max)), //gets the largest demoid
        },
    });
}));
/**
 * @api {post} /c/library Request to add an entry
 *
 * @apiDescription Request to add a message and someone's name to the DB
 *
 * @apiName ClosedPostMessage
 * @apiGroup *Closed Message
 *
 * @apiUse JWT
 *
 * @apiBody {string} name someone's name *unique
 * @apiBody {string} message a message to store with the name
 * @apiBody {number} priority a message priority [1-3]
 *
 * @apiSuccess {Object} entry the message entry objects of all entries
 * @apiSuccess {string} entry.name <code>name</code>
 * @apiSuccess {string} entry.message The message associated with <code>name</code>
 * @apiSuccess {number} entry.priority The priority associated with <code>name</code>
 * @apiSuccess {string} entry.formatted the entry as the following string:
 *      "{<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 *
 * @apiError (400: Name exists) {String} message "Name exists"
 * @apiError (400: Missing Parameters) {String} message "Missing required information - please refer to documentation"
 * @apiError (400: Invalid Priority) {String} message "Invalid or missing Priority  - please refer to documentation"
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */
libraryRouter.post('/', (request, response, next) => {
    if (isStringProvided(request.body.name) &&
        isStringProvided(request.body.message)) {
        next();
    }
    else {
        console.error('Missing required information');
        response.status(400).send({
            message: 'Missing required information - please refer to documentation',
        });
    }
}, (request, response, next) => {
    const priority = request.body.priority;
    if (utilities_1.validationFunctions.isNumberProvided(priority) &&
        parseInt(priority) >= 1 &&
        parseInt(priority) <= 3) {
        next();
    }
    else {
        console.error('Invalid or missing Priority');
        response.status(400).send({
            message: 'Invalid or missing Priority - please refer to documentation',
        });
    }
}, (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    //We're using placeholders ($1, $2, $3) in the SQL query string to avoid SQL Injection
    //If you want to read more: https://stackoverflow.com/a/8265319
    const theQuery = 'INSERT INTO DEMO(Name, Message, Priority) VALUES ($1, $2, $3) RETURNING *';
    const values = [
        request.body.name,
        request.body.message,
        request.body.priority,
    ];
    try {
        const result = yield utilities_1.pool.query(theQuery, values);
        // result.rows array are the records returned from the SQL statement.
        // An INSERT statement will return a single row, the row that was inserted.
        response.status(201).send({
            entry: format(result.rows[0]),
        });
    }
    catch (error) {
        if (error.detail && error.detail.endsWith('exists.')) {
            console.error('Name exists');
            response.status(400).send({
                message: 'Name exists',
            });
        }
        else {
            //log the error
            console.error('DB Query error on POST');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        }
    }
}));
/**
 * @api {delete} /c/library/:name Request to remove an entry by name
 *
 * @apiDescription Request to remove an entry associated with <code>name</code> in the DB
 *
 * @apiName ClosedDeleteMessage
 * @apiGroup *Closed Message
 *
 * @apiUse JWT
 *
 * @apiParam {String} name the name associated with the entry to delete
 *
 * @apiSuccess {String} entry the string
 *      "Deleted: {<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 *
 * @apiError (404: Name Not Found) {String} message "Name not found"
 */
libraryRouter.delete('/:name', (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    const theQuery = 'DELETE FROM Demo  WHERE name = $1 RETURNING *';
    const values = [request.params.name];
    try {
        const result = yield utilities_1.pool.query(theQuery, values);
        if (result.rowCount == 1) {
            response.send({
                entry: 'Deleted: ' + format(result.rows[0]).formatted,
            });
        }
        else {
            response.status(404).send({
                message: 'Name not found',
            });
        }
    }
    catch (error) {
        //log the error
        console.error('DB Query error on DELETE /:name');
        console.error(error);
        response.status(500).send({
            message: 'server error - contact support',
        });
    }
}));
//# sourceMappingURL=closed_message.js.map