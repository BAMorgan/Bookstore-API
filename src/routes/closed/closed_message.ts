//express is the framework we're going to use to handle requests
import express, { NextFunction, Request, Response, Router } from 'express';
//Access the connection to Postgres Database
import { pool, validationFunctions } from '../../core/utilities';

const libraryRouter: Router = express.Router();

const format = (resultRow) => ({
    ...resultRow,
    formatted: `{${resultRow.priority}} - [${resultRow.name}] says: ${resultRow.message}`,
});

const isStringProvided = validationFunctions.isStringProvided;
const isNumberProvided = validationFunctions.isNumberProvided;

libraryRouter.get('/offset', async (request: Request, response: Response) => {
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
    const limit: number =
        isNumberProvided(request.query.limit) && +request.query.limit > 0
            ? +request.query.limit
            : 10;
    const offset: number =
        isNumberProvided(request.query.offset) && +request.query.offset >= 0
            ? +request.query.offset
            : 0;

    const values = [limit, offset];

    // demonstrating deconstructing the returned object. const { rows }
    const { rows } = await pool.query(theQuery, values);

    // This query is SLOW on large datasets! - Beware!
    const result = await pool.query(
        'SELECT count(*) AS exact_count FROM demo;'
    );
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
});


libraryRouter.get('/cursor', async (request: Request, response: Response) => {
    const theQuery = `SELECT name, message, priority, DemoID 
                        FROM Demo
                        WHERE DemoID > $2  
                        ORDER BY DemoID
                        LIMIT $1`;

    // NOTE: +request.query.limit the + tells TS to treat this string as a number
    const limit: number =
        isNumberProvided(request.query.limit) && +request.query.limit > 0
            ? +request.query.limit
            : 10;
    const cursor: number =
        isNumberProvided(request.query.cursor) && +request.query.cursor >= 0
            ? +request.query.cursor
            : 0; // autogenerated ids start at 1 so 0 is a valid starting cursor

    const values = [limit, cursor];

    // demonstrating deconstructing the returned object. const { rows }
    const { rows } = await pool.query(theQuery, values);

    // This query is SLOW on large datasets! - Beware!
    const result = await pool.query(
        'SELECT count(*) AS exact_count FROM demo;'
    );
    const count = result.rows[0].exact_count;

    response.send({
        entries: rows.map(({ demoid, ...rest }) => rest).map(format), //removes demoid property
        pagination: {
            totalRecords: count,
            limit,
            cursor: rows
                .map((row) => row.demoid) //note the lowercase, the field names for rows are all lc
                .reduce((max, id) => (id > max ? id : max)), //gets the largest demoid
        },
    });
});

libraryRouter.post(
    '/',
    (request: Request, response: Response, next: NextFunction) => {
        if (
            isStringProvided(request.body.name) &&
            isStringProvided(request.body.message)
        ) {
            next();
        } else {
            console.error('Missing required information');
            response.status(400).send({
                message:
                    'Missing required information - please refer to documentation',
            });
        }
    },
    (request: Request, response: Response, next: NextFunction) => {
        const priority: string = request.body.priority as string;
        if (
            validationFunctions.isNumberProvided(priority) &&
            parseInt(priority) >= 1 &&
            parseInt(priority) <= 3
        ) {
            next();
        } else {
            console.error('Invalid or missing Priority');
            response.status(400).send({
                message:
                    'Invalid or missing Priority - please refer to documentation',
            });
        }
    },
    async (request: Request, response: Response) => {
        //We're using placeholders ($1, $2, $3) in the SQL query string to avoid SQL Injection
        //If you want to read more: https://stackoverflow.com/a/8265319
        const theQuery =
            'INSERT INTO DEMO(Name, Message, Priority) VALUES ($1, $2, $3) RETURNING *';
        const values = [
            request.body.name,
            request.body.message,
            request.body.priority,
        ];

        try {
            const result = await pool.query(theQuery, values);
            // result.rows array are the records returned from the SQL statement.
            // An INSERT statement will return a single row, the row that was inserted.
            response.status(201).send({
                entry: format(result.rows[0]),
            });
        } catch (error) {
            if (error.detail && <string>error.detail.endsWith('exists.')) {
                console.error('Name exists');
                response.status(400).send({
                    message: 'Name exists',
                });
            } else {
                //log the error
                console.error('DB Query error on POST');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact support',
                });
            }
        }
    }
);

libraryRouter.delete('/:name', async (request: Request, response: Response) => {
    const theQuery = 'DELETE FROM Demo  WHERE name = $1 RETURNING *';
    const values = [request.params.name];

    try {
        const result = await pool.query(theQuery, values);
        if (result.rowCount == 1) {
            response.send({
                entry: 'Deleted: ' + format(result.rows[0]).formatted,
            });
        } else {
            response.status(404).send({
                message: 'Name not found',
            });
        }
    } catch (error) {
        //log the error
        console.error('DB Query error on DELETE /:name');
        console.error(error);
        response.status(500).send({
            message: 'server error - contact support',
        });
    }
});

// "return" the router
export { libraryRouter };
