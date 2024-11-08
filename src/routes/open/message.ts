//express is the framework we're going to use to handle requests
import express, { NextFunction, Request, Response, Router } from 'express';
//Access the connection to Postgres Database
import { pool, validationFunctions } from '../../core/utilities';

const messageRouter: Router = express.Router();

const isStringProvided = validationFunctions.isStringProvided;

/*const format = (resultRow) =>
    `{${resultRow.priority}} - [${resultRow.name}] says: ${resultRow.message}`;*/
const format = (resultRow) =>
    `{${resultRow.title}} by [${resultRow.authors}] - ISBN: [${resultRow.isbn13}], published in [${resultRow.publication_year}], average rating: [${resultRow.rating_avg}]`;

function mwValidPriorityQuery(
    request: Request,
    response: Response,
    next: NextFunction
) {
    const priority: string = request.query.priority as string;
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
}

function mwValidNameMessageBody(
    request: Request,
    response: Response,
    next: NextFunction
) {
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
}

/**
 * @apiDefine JSONError
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */

/**
 * @api {post} /message Request to add an entry
 *
 * @apiDescription Request to add a message and someone's name to the DB
 *
 * @apiName PostMessage
 * @apiGroup Message
 *
 * @apiBody {string} name someone's name *unique
 * @apiBody {string} message a message to store with the name
 * @apiBody {number} priority a message priority [1-3]
 *
 *
 * @apiSuccess (Success 201) {String} entry the string:
 *      "{<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 *
 * @apiError (400: Name exists) {String} message "Name exists"
 * @apiError (400: Missing Parameters) {String} message "Missing required information - please refer to documentation"
 * @apiError (400: Invalid Priority) {String} message "Invalid or missing Priority  - please refer to documentation"
 * @apiUse JSONError
 */
messageRouter.post(
    '/',
    mwValidNameMessageBody,
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
    (request: Request, response: Response) => {
        //We're using placeholders ($1, $2, $3) in the SQL query string to avoid SQL Injection
        //If you want to read more: https://stackoverflow.com/a/8265319
        const theQuery =
            'INSERT INTO DEMO(Name, Message, Priority) VALUES ($1, $2, $3) RETURNING *';
        const values = [
            request.body.name,
            request.body.message,
            request.body.priority,
        ];

        pool.query(theQuery, values)
            .then((result) => {
                // result.rows array are the records returned from the SQL statement.
                // An INSERT statement will return a single row, the row that was inserted.
                response.status(201).send({
                    entry: format(result.rows[0]),
                });
            })
            .catch((error) => {
                if (
                    error.detail != undefined &&
                    (error.detail as string).endsWith('already exists.')
                ) {
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
            });
    }
);

/**
 * @api {post} /library/add Request to add an entry
 *
 * @apiDescription Request to add a book to the DB
 *
 * @apiName PostMessage
 * @apiGroup Library
 *
 * @apiBody {number} ISBN ISBN *unique
 * @apiBody {string} Title Title of the book *unique
 * @apiBody {string} Author Author of the book
 * @apiBody {number} Date The publication year
 * @apiBody {number} [totalRatings] total number of ratings
 * @apiBody {number} [1Star] number of 1 star reviews
 * @apiBody {number} [2Star] number of 2 star reviews
 * @apiBody {number} [3Star] number of 3 star reviews
 * @apiBody {number} [4Star] number of 4 star reviews
 * @apiBody {number} [5Star] number of 5 star reviews
 *
 * @apiSuccess (Success 201) {JSON} Book The entered book object
 *
 * @apiError (400: ISBN exists) {String} message "ISBN already exists"
 * @apiError (400: Missing ISBN) {String} message "Missing ISBN - please refer to documentation"
 * @apiError (400: Missing title) {String} message "Missing book title - please refer to documentation"
 * @apiError (400: Missing author) {String} message "Missing book author - please refer to documentation"
 * @apiError (400: Missing Parameters) {String} message "Missing required information - please refer to documentation"
 * @apiUse JSONError
 */

function myValidAuthorQuery(
    request: Request,
    response: Response,
    next: NextFunction
) {
    const author: string = request.query.authors as string;
    if (validationFunctions.isStringProvided(author)) {
        next();
    } else {
        response.status(400).send({
            message:
                'Invalid or missing author - please refer to documentation',
        });
    }
}

/**
 * @api {get} /library?authors= Request to retrieve books by author's name
 *
 * @apiDescription Request to retrieve the information about all books written by <code>author</code>.
 *
 * @apiName GetMessageAuthor
 * @apiGroup Library
 *
 * @apiQuery {string} author the author to look up.
 *
 * @apiSuccess {String[]} entries the aggregate of all entries as the following string:
 *      "{<code>title</code>} by <code>authors</code> - ISBN: <code>isbn13</code>, published in <code>publication_year</code>, average rating: <code>rating_avg</code>"
 *
 * @apiError (400: Invalid author) {String} message "Invalid or missing author  - please refer to documentation"
 * @apiError (404: Book Not Found) {string} message "No book associated with this author was found"
 *
 */
messageRouter.get('/', (request: Request, response: Response, next) => {
    const publishedYear: string = request.query.publication_year as string;
    const ratingAvg: string = request.query.rating_avg as string;
    const author: string = request.query.authors as string;
    if (author && !ratingAvg && !publishedYear) {
        myValidAuthorQuery(request, response, () => {
            const theQuery =
                "SELECT isbn13, authors, publication_year, title, rating_avg FROM BOOKS WHERE authors LIKE '%' || $1 || '%'";
            const values = [request.query.authors];

            pool.query(theQuery, values)
                .then((result) => {
                    if (result.rowCount > 0) {
                        response.send({
                            entries: result.rows.map(format),
                        });
                    } else {
                        response.status(404).send({
                            message: `No book associated with this author was found`,
                        });
                    }
                })
                .catch((error) => {
                    //log the error
                    console.error('DB Query error on GET by author');
                    console.error(error);
                    response.status(500).send({
                        message: 'server error - contact support',
                    });
                });
        });
    } else {
        next();
    }
});

function myValidPublicationYearQuery(
    request: Request,
    response: Response,
    next: NextFunction
) {
    const publishedYear: string = request.query.publication_year as string;
    if (
        validationFunctions.isNumberProvided(publishedYear) &&
        publishedYear.length == 4
    ) {
        next();
    } else {
        response.status(400).send({
            message:
                'Invalid or missing publication_year - please refer to documentation',
        });
    }
}

/**
 * @api {get} /library?publication_year= Request to retrieve books by original publication year
 *
 * @apiDescription Request to retrieve the information about all books published in <code>publication_year</code>.
 *
 * @apiName GetMessagePublicationYear
 * @apiGroup Library
 *
 * @apiQuery {number} publication_year the publication year to look up.
 *
 * @apiSuccess {String[]} entries the aggregate of all entries as the following string:
 *      "{<code>title</code>} by <code>author</code> - ISBN: <code>isbn13</code>, published in <code>publication_year</code>, average rating: <code>rating_avg</code>"
 *
 * @apiError (400: Invalid publication year) {String} message "Invalid or missing publication_year  - please refer to documentation"
 * @apiError (404: Book Not Found) {string} message "No book associated with this publication year was found"
 *
 */
messageRouter.get('/', (request: Request, response: Response, next) => {
    const publishedYear: string = request.query.publication_year as string;
    const ratingAvg: string = request.query.rating_avg as string;
    const authors: string = request.query.authors as string;
    if (publishedYear && !ratingAvg && !authors) {
        myValidPublicationYearQuery(request, response, () => {
            const theQuery =
                'SELECT isbn13, authors, publication_year, title, rating_avg FROM BOOKS where publication_year = $1';
            const values = [request.query.publication_year];

            pool.query(theQuery, values)
                .then((result) => {
                    if (result.rowCount > 0) {
                        response.send({
                            entries: result.rows.map(format),
                        });
                    } else {
                        response.status(404).send({
                            message: `No book associated with this publication year was found`,
                        });
                    }
                })
                .catch((error) => {
                    //log the error
                    console.error('DB Query error on GET by publication_year');
                    console.error(error);
                    response.status(500).send({
                        message: 'server error - contact support',
                    });
                });
        });
    } else {
        next();
    }
});

function myValidIsbn13Param(
    request: Request,
    response: Response,
    next: NextFunction
) {
    const ISBN: string = request.params.isbn13 as string;
    if (validationFunctions.isNumberProvided(ISBN) && ISBN.length == 13) {
        next();
    } else {
        console.error('Invalid or missing isbn13');
        response.status(400).send({
            message:
                'Invalid or missing isbn13 - please refer to documentation',
        });
    }
}
/**
 * @api {get} /library/isbn13/:isbn13 Request to retrieve a book by isbn13
 *
 * @apiDescription Request to retrieve a specific book by <code>isbn13</code>. 
 *
 * @apiName GetMessageIsbn
 * @apiGroup Library
 *
 * @apiParam {number} isbn13 the isbn13 to look up the specific book.
 * 
 * @apiSuccess {Object} entry the message book object for <code>isbn13</code>
 * @apiSuccess {number} entry.isbn13 <code>isbn13</code>
 * @apiSuccess {string} entry.authors the author of the book associated with <code>isbn13</code>
 * @apiSuccess {number} entry.publication_year the published year of the book associated with <code>isbn13</code>
 * @apiSuccess {string} entry.title the book title associated with <code>isbn13</code>
 * @apiSuccess {number} entry.rating_avg The average rating of the book associated with <code>isbn13</code>

 *
 * @apiError (400: Invalid isbn13) {String} message "Invalid or missing isbn13  - please refer to documentation"
 * @apiError (404: Book Not Found) {string} message "No book associated with this isbn13 was found"
 *
 */
messageRouter.get(
    '/isbn13/:isbn13',
    myValidIsbn13Param,
    (request: Request, response: Response) => {
        const theQuery =
            'SELECT isbn13, authors, publication_year, title, rating_avg FROM BOOKS WHERE isbn13 = $1';
        const values = [request.params.isbn13];

        pool.query(theQuery, values)
            .then((result) => {
                if (result.rowCount == 1) {
                    response.send({
                        entry: result.rows[0],
                    });
                } else {
                    response.status(404).send({
                        message:
                            'No book associated with this isbn13 was found',
                    });
                }
            })
            .catch((error) => {
                //log the error
                console.error('DB Query error on GET /:isbn13');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact support',
                });
            });
    }
);
function myValidTitleParam(
    request: Request,
    response: Response,
    next: NextFunction
) {
    const title: string = request.params.title as string;
    if (
        !validationFunctions.isNumberProvided(title) &&
        validationFunctions.isStringProvided(title)
    ) {
        next();
    } else {
        console.error('Invalid or missing title');
        response.status(400).send({
            message: 'Invalid or missing title - please refer to documentation',
        });
    }
}

/**
 * @api {get} /library/title/:title Request to retrieve a book by title
 *
 * @apiDescription Request to retrieve a specific book by <code>title</code>. 
 *
 * @apiName RetrieveBookTitle
 * @apiGroup Library
 *
 * @apiParam {string} title the title to look up the specific book.
 * 
 * @apiSuccess {Object} entry the message book object for <code>title</code>
 * @apiSuccess {number} entry.isbn13 the ISBN of the book associated with <code>title</code>
 * @apiSuccess {string} entry.authors the author of the book associated with <code>title</code>
 * @apiSuccess {number} entry.publication_year the published year of the book associated with <code>title</code>
 * @apiSuccess {string} entry.title the book title associated with <code>title</code>
 * @apiSuccess {number} entry.rating_avg The average rating of the book associated with <code>title</code>

 *
 * @apiError (400: Invalid title) {String} message "Invalid or missing title  - please refer to documentation"
 * @apiError (404: Book Not Found) {string} message "No book associated with this title was found"
 *
 */
messageRouter.get(
    '/title/:title',
    myValidTitleParam,
    (request: Request, response: Response) => {
        const theQuery =
            'SELECT isbn13, authors, publication_year, title, rating_avg FROM BOOKS where title = $1';
        const values = [request.params.title];

        pool.query(theQuery, values)
            .then((result) => {
                if (result.rowCount == 1) {
                    response.send({
                        entry: result.rows[0],
                    });
                } else {
                    response.status(404).send({
                        message: `No book associated with this title was found`,
                    });
                }
            })
            .catch((error) => {
                //log the error
                console.error('DB Query error on GET by title');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact support',
                });
            });
    }
);

function mwValidRatingAverageQuery(
    request: Request,
    response: Response,
    next: NextFunction
) {
    const ratingAvg: string = request.query.rating_avg as string;
    if (validationFunctions.isNumberProvided(ratingAvg)) {
        next();
    } else {
        response.status(400).send({
            message:
                'Invalid or missing rating_avg - please refer to documentation',
        });
    }
}

/**
 * @api {get} /library?rating_avg= Request to retrieve books by rating average
 *
 * @apiDescription Request to retrieve the information about all books with the given <code>rating_avg</code>
 *
 * @apiName RetrieveByRatingAvg
 * @apiGroup Library
 *
 * @apiQuery {number} rating_avg the rating_avg to look up.
 *
 * @apiSuccess {String[]} entries the aggregate of all entries as the following string:
 *      "{<code>title</code>} by <code>authors</code> - ISBN: <code>isbn13</code>, published in <code>publication_year</code>, average rating: <code>rating_avg</code>"
 *
 * @apiError (400: Invalid rating_avg) {string} message "Invalid or missing rating_avg - please refer to documentation"
 * @apiError (404: Book Not Found) {string} message "No book associated with this rating_avg was found"
 *
 */
messageRouter.get(
    '/',
    mwValidRatingAverageQuery,
    (request: Request, response: Response) => {
        const theQuery =
            'SELECT isbn13, authors, publication_year, title, rating_avg FROM BOOKS where rating_avg = $1';
        const values = [request.query.rating_avg];

        pool.query(theQuery, values)
            .then((result) => {
                if (result.rowCount > 0) {
                    response.send({
                        entries: result.rows.map(format),
                    });
                } else {
                    response.status(404).send({
                        message: `No book associated with this rating_avg was found`,
                    });
                }
            })
            .catch((error) => {
                //log the error
                console.error('DB Query error on GET by rating_avg');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact support',
                });
            });
    }
);

/**
 * @api {get} /library/retrieve Request to retrieve all books
 *
 * @apiDescription Request to retrieve the information about all books
 *
 * @apiName RetrieveAllBooks
 * @apiGroup Library
 *
 * @apiSuccess {String[]} entries the aggregate of all entries as the following string:
 *      "{<code>title</code>} by <code>authors</code> - ISBN: <code>isbn13</code>, published in <code>publication_year</code>, average rating: <code>rating_avg</code>"
 *
 * @apiError (404: Books Not Found) {string} message "No books found"
 *
 */
messageRouter.get('/retrieve', (request: Request, response: Response) => {
    const theQuery =
        'SELECT title, authors, isbn13, publication_year, rating_avg FROM BOOKS';

    pool.query(theQuery)
        .then((result) => {
            if (result.rowCount > 0) {
                response.send({
                    entries: result.rows.map(format),
                });
            } else {
                response.status(404).send({
                    message: 'No books found',
                });
            }
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET retrieve');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
});

/**
 * @api {put} /library/update/ratings Request to update book rating
 *
 * @apiDescription Updates the count of star ratings or a book by <code>title</code>
 *
 * @apiName UpdateRating
 * @apiGroup Library
 *
 * @apiBody {String} title The title of the book to update.
 * @apiBody {Number{0+}} [rating_1_star] The new count for 1-star ratings.
 * @apiBody {Number{0+}} [rating_2_star] The new count for 2-star ratings.
 * @apiBody {Number{0+}} [rating_3_star] The new count for 3-star ratings.
 * @apiBody {Number{0+}} [rating_4_star] The new count for 4-star ratings.
 * @apiBody {Number{0+}} [rating_5_star] The new count for 5-star ratings.
 *
 * @apiSuccess {String} message Confirmation that the book's ratings have been updated.
 *
 *
 * @apiError (404: Book Not Found) {String} message "Book title not found"
 * @apiError (400: Missing Parameters) {String} message "At least one rating count must be provided"
 * @apiError (400: Invalid Rating Count) {String} message "Rating counts must be non-negative integers"
 * @apiUse JSONError
 */

/**
 * @api {delete} /library/remove/ISBN/:ISBN Request to remove book entries by ISBN
 *
 * @apiDescription Request to remove all entries of <code>isbn</code>
 *
 * @apiName DeleteISBN
 * @apiGroup Library
 *
 * @apiParam {number} ISBN The ISBN of the book to remove
 *
 *
 * @apiSuccess {String[]} entries The list of deleted entries, formatted as:
 *      "ISBN: <code>isbn</code>, Title: <code>title</code>"
 *
 * @apiError (400: Invalid or missing ISBN) {String} message "Invalid or missing ISBN - please refer to documentation"
 * @apiError (404: No ISBN found) {String} message "No matching <code>isbn</code> entries found"
 */

/**
 * @api {delete} /library/remove/author/:author Request to remove a series by author
 *
 * @apiDescription Request to remove an entry associated with <code>author</code> in the DB
 *
 * @apiName DeleteAuthor
 * @apiGroup Library
 *
 * @apiParam {String} author The author associated with the entries to delete
 *
 * @apiSuccess {String} entries A string of the deleted book entry, formatted as:
 *     "Deleted: ISBN: <code>isbn</code>, Title: <code>title</code>"
 *
 * @apiError (404: Author Not Found) {String} message "Author not found"
 */

/**
 * @api {get} /message/all Request to all retrieve entries
 *
 * @apiDescription Request to retrieve all the entries
 *
 * @apiName GetAllMessages
 * @apiGroup Message
 *
 * @apiSuccess {String[]} entries the aggregate of all entries as the following string:
 *      "{<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 */
messageRouter.get('/all', (request: Request, response: Response) => {
    const theQuery = 'SELECT name, message, priority FROM Demo';

    pool.query(theQuery)
        .then((result) => {
            response.send({
                entries: result.rows.map(format),
            });
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET all');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
});

/**
 * @api {get} /message Request to retrieve entries by priority
 *
 * @apiDescription Request to retrieve all the entries of <code>priority</code>
 *
 * @apiName GetAllMessagesPri
 * @apiGroup Message
 *
 * @apiQuery {number} priority the priority in which to retrieve all entries
 *
 * @apiSuccess {String[]} entries the aggregate of all entries with <code>priority</code> as the following string:
 *      "{<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 *
 * @apiError (400: Invalid Priority) {String} message "Invalid or missing Priority  - please refer to documentation"
 * @apiError (404: No messages) {String} message "No Priority <code>priority</code> messages found"
 */
messageRouter.get(
    '/',
    mwValidPriorityQuery,
    (request: Request, response: Response) => {
        const theQuery =
            'SELECT name, message, priority FROM Demo where priority = $1';
        const values = [request.query.priority];

        pool.query(theQuery, values)
            .then((result) => {
                if (result.rowCount > 0) {
                    response.send({
                        entries: result.rows,
                    });
                } else {
                    response.status(404).send({
                        message: `No Priority ${request.query.priority} messages found`,
                    });
                }
            })
            .catch((error) => {
                //log the error
                console.error('DB Query error on GET by priority');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact support',
                });
            });
    }
);

/**
 * @api {get} /message/name/:name Request to retrieve an entry by name
 *
 * @apiDescription Request to retrieve the complete entry for <code>name</code>.
 * Note this endpoint returns an entry as an object, not a formatted string like the
 * other endpoints.
 *
 * @apiName GetMessageName
 * @apiGroup Message
 *
 * @apiParam {string} name the name to look up.
 *
 * @apiSuccess {Object} entry the message entry object for <code>name</code>
 * @apiSuccess {string} entry.name <code>name</code>
 * @apiSuccess {string} entry.message The message associated with <code>name</code>
 * @apiSuccess {number} entry.priority The priority associated with <code>name</code>
 *
 * @apiError (404: Name Not Found) {string} message "Name not found"
 */
messageRouter.get('/name/:name', (request: Request, response: Response) => {
    const theQuery = 'SELECT name, message, priority FROM Demo WHERE name = $1';
    const values = [request.params.name];

    pool.query(theQuery, values)
        .then((result) => {
            if (result.rowCount == 1) {
                response.send({
                    entry: result.rows[0],
                });
            } else {
                response.status(404).send({
                    message: 'Name not found',
                });
            }
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET /:name');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
});

/**
 * @api {put} /message Request to change an entry
 *
 * @apiDescription Request to replace the message entry in the DB for name
 *
 * @apiName PutMessage
 * @apiGroup Message
 *
 * @apiBody {String} name the name entry
 * @apiBody {String} message a message to replace with the associated name
 *
 * @apiSuccess {String} entry the string
 *      "Updated: {<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 *
 * @apiError (404: Name Not Found) {String} message "Name not found"
 * @apiError (400: Missing Parameters) {String} message "Missing required information" *
 * @apiUse JSONError
 */
messageRouter.put(
    '/',
    mwValidNameMessageBody,
    (request: Request, response: Response, next: NextFunction) => {
        const theQuery =
            'UPDATE Demo SET message = $1 WHERE name = $2 RETURNING *';
        const values = [request.body.message, request.body.name];

        pool.query(theQuery, values)
            .then((result) => {
                if (result.rowCount == 1) {
                    response.send({
                        entry: 'Updated: ' + format(result.rows[0]),
                    });
                } else {
                    response.status(404).send({
                        message: 'Name not found',
                    });
                }
            })
            .catch((error) => {
                //log the error
                console.error('DB Query error on PUT');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact support',
                });
            });
    }
);

/**
 * @api {delete} /message Request to remove entries by priority
 *
 * @apiDescription Request to remove all entries of <code>priority</code>
 *
 * @apiName DeleteMessagesPri
 * @apiGroup Message
 *
 * @apiQuery {number} priority the priority [1-3] to delete all entries
 *
 * @apiSuccess {String[]} entries the aggregate of all deleted entries with <code>priority</code> as the following string:
 *      "{<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 *
 * @apiError (400: Invalid or missing Priority) {String} message "Invalid or missing Priority - please refer to documentation"
 * @apiError (404: No messages) {String} message "No Priority <code>priority</code> messages found"
 */
messageRouter.delete(
    '/',
    mwValidPriorityQuery,
    (request: Request, response: Response) => {
        const theQuery = 'DELETE FROM Demo  WHERE priority = $1 RETURNING *';
        const values = [request.query.priority];

        pool.query(theQuery, values)
            .then((result) => {
                if (result.rowCount > 0) {
                    response.send({
                        entries: result.rows.map(format),
                    });
                } else {
                    response.status(404).send({
                        message: `No Priority ${request.query.priority} messages found`,
                    });
                }
            })
            .catch((error) => {
                //log the error
                console.error('DB Query error on DELETE by priority');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact support',
                });
            });
    }
);

/**
 * @api {delete} /message/:name Request to remove an entry by name
 *
 * @apiDescription Request to remove an entry associated with <code>name</code> in the DB
 *
 * @apiName DeleteMessage
 * @apiGroup Message
 *
 * @apiParam {String} name the name associated with the entry to delete
 *
 * @apiSuccess {String} entry the string
 *      "Deleted: {<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 *
 * @apiError (404: Name Not Found) {String} message "Name not found"
 */
messageRouter.delete('/:name', (request: Request, response: Response) => {
    const theQuery = 'DELETE FROM Demo  WHERE name = $1 RETURNING *';
    const values = [request.params.name];

    pool.query(theQuery, values)
        .then((result) => {
            if (result.rowCount == 1) {
                response.send({
                    entry: 'Deleted: ' + format(result.rows[0]),
                });
            } else {
                response.status(404).send({
                    message: 'Name not found',
                });
            }
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on DELETE /:name');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
});

// "return" the router
export { messageRouter };
