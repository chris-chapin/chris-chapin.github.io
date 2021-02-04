function makeIndent() {
    let indentString = ``;
    const indentSize = `    `;

    return {
        increaseIndent: function() {
            indentString = indentString.concat(indentSize);
        },

        decreaseIndent: function() {
            indentString = indentString.substring(0, indentString.length - indentSize.length);
        },

        getIndent: function() {
            return indentString;
        }
    }
}

let globalIndent = makeIndent();

function prettyJson(obj, test = false)
{
    let result = `{\n`;

    if (test) {
        result += testJsonTraverse();
    }
    else {
        result += traverseJson(obj)
    }

    result += `\n}`;

    return result;
}

function testJsonTraverse() {
    let testObj = {
        stairs: 10,
        reason: "exercise",
        performedToday: false,
        Days: [
            "Monday",
            "Tuesday",
            "Wednesday",
            {
                AwkwardArray: true,
                Data: "I'm an awkward array",
                EmbeddedArray: [
                    "no",
                    1,
                    true                
                ]
            },
            [
                {
                    moreArrays: "please no"
                },
                true,
                1,
                "stop"
            ]
        ]
    };

    return traverseJson(testObj);
}

function traverseJson(obj, isObj = true)
{
    let result = ``;
    let keys = Object.keys(obj);
    let propCount = 0;
    globalIndent.increaseIndent();

    for (curKey of keys) {        
        result += globalIndent.getIndent();

        // don't output array indices (ie. "0: ", "1: ", "2: ",...)
        if (isObj) {
            result += `"${curKey}": `;
        }

        switch (typeof obj[curKey])
        {
            case 'object':
                if (Array.isArray(obj[curKey])) {
                    result += `[\n`;
                    result += traverseJson(obj[curKey], false);
                    result += `\n${globalIndent.getIndent()}]`;
                }
                else {
                    result += `{\n`;
                    result += traverseJson(obj[curKey]);
                    result += `\n${globalIndent.getIndent()}}`;
                }
                break;

            case 'boolean':
                result += obj[curKey] === true ? `true` : `false`;
                break;

            // Bonus: escape special characters
            case 'string':
                result += `"${obj[curKey]}"`;
                break;

            case 'number':
                result += `${obj[curKey]}`;
                break;
        }

        // the last prop should not have a trailing comma
        if (propCount !== keys.length - 1) {
            result += `,\n`;
        }

        propCount++;
    }

    globalIndent.decreaseIndent();

    return result;
}

function printDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function parseAlbums(jsonData, trips) {
    // we have lots of albums; these folders contain the only albums we are interested in
    jsonData.Response.Album.filter(value => {
        if (value.WebUri.includes(`HikesandScrambles`) || 
            value.WebUri.includes(`Climbing`) ||
            value.WebUri.includes(`Skiing`)) {
            return true;
        }

        return false;
    }).forEach(value => {
        // the month codes are specific to our "very rigid and consistent" naming scheme on SmugMug
        const monthCodes = `January|Jan|February|Feb|March|Mar|April|May|June|July|August|Aug|September|Sept|Sep|October|Oct|November|Nov|December|Dec`;

        // given our folder and album hierarchy, the year comes from the WebUri and the starting\[ending] month(s) and day(s) come from the Title
        let yearRegex = /(HikesandScrambles|Skiing|Climbing)\/(\d{4})\//;
        let monthDayRegex = new RegExp(`(${monthCodes}) (\\d+)\\s?-?\\s?(${monthCodes})?\\s?(\\d+)?\\s?(\\D+)?`);

        let parsedUri = value.WebUri.match(yearRegex);
        let parsedTitle = value.Title.match(monthDayRegex);
       
        /*
            Trips can be single day, multi-day, multi-month, or (big edge case that we will likely choose to ignore) "multi-year"
            parsedTitle[0] = full date range
            parsedTitle[1] = <start date month>
            parsedTitle[2] = <start date day of month>
            parsedTitle[3] = [end date month] (ie. monthDay[4] === undefined ? monthDay[2] : monthDay[4])
            parsedTitle[4] = [end date day of month]
            parsedTitle[5] = [any extra trip information]
        */

        if (parsedUri !== null && parsedTitle !== null) {
            let year = parsedUri[2];
            let trip = {
                title: value.Title.slice(0, value.Title.indexOf(parsedTitle[1]) - 2),
                uri: value.WebUri,
                startDate: new Date(`${parsedTitle[1]} ${parsedTitle[2]}, ${year}`),
                endDate: undefined,
                activity: parsedUri[1]
            };

            // trying to capture additional trailing trip details but not inconsistent titles with ", year"
            // sigh, our album management on SmugMug could use cleansing (next app perhaps? scary!)
            if (parsedTitle[5] !== undefined && parsedTitle[5] !== `, `) {
                trip.title = `${trip.title} ${parsedTitle[5]}`;
            }

            // multi-day trip
            if (parsedTitle[4] !== undefined) {
                // trip spanned months
                if (parsedTitle[3] !== undefined) {
                    trip.endDate = new Date(`${parsedTitle[3]} ${parsedTitle[4]}, ${year}`);

                    // trip spanned years (somewhat fragile test)
                    if (trip.startDate.getMonth() === 11 && trip.endDate.getMonth() === 0) {
                        trip.endDate.setFullYear(trip.endDate.getFullYear() + 1);
                    }
                }
                else {
                    // trip contained within same month
                    trip.endDate = new Date(`${parsedTitle[1]} ${parsedTitle[4]}, ${year}`);
                }
            }

            trips.push(trip);
        }
    });
}

function sortTrips(trips, descending) {
    if (descending === true) {
        sortTripsDescending(trips);
    }
    else {
        sortTripsAscending(trips);
    }
}

// oldest to newest
function sortTripsDescending(trips) {
    return trips.sort((a, b) => {
        if (a.startDate < b.startDate) {
            return -1;
        }

        if (a.startDate > b.startDate) {
            return 1;
        }

        return 0;
    });
}

// newest to oldest
function sortTripsAscending(trips) {
    return trips.sort((a, b) => {
        if (a.startDate > b.startDate) {
            return -1;
        }

        if (a.startDate < b.startDate) {
            return 1;
        }

        return 0;
    });
}

function processTrips(trips) {
    let resultString = ``;

    sortTripsDescending(trips).forEach(value => {
        let endDate = ``;

        if (value.endDate !== undefined) {
            endDate = ` - ${printDate(value.endDate)}`;
        }

        resultString += `${printDate(value.startDate)}${endDate}\t<b>${value.title}</b>\n`;
    });

    return resultString;
}

function createYearRow(year) {
    // create the row div for the year
    let yearRow = document.createElement(`div`);
    yearRow.classList = `yearRow cel`;
    yearRow.appendChild(document.createTextNode(`${year}`));
    document.getElementById(`tripsBody`).appendChild(yearRow);
}

/*
  1. create the row div for the trip
  2. create the divs for start date, end date, trip name, trip activity
  3. append #2 divs to row div
  4. append row div to trips div
*/
function createTripRow(trip, index) {
    let backgroundStyle = index % 2 === 0 ? `even` : `odd`;

    // 1. create the row div for the trip
    let tripRow = document.createElement(`div`);
    tripRow.classList = `tripRow ${backgroundStyle}`;

    // 2a. start date div
    let startDiv = document.createElement(`div`);
    startDiv.className = `startDate cel`;
    startDiv.appendChild(document.createTextNode(`${printDate(trip.startDate)}`));

    // 2b. end date div
    let endDiv = document.createElement(`div`);
    let endDate = `-`;
    endDiv.className = `endDate cel`;
    if (trip.endDate !== undefined) {
        endDate = printDate(trip.endDate);
    }
    endDiv.appendChild(document.createTextNode(`${endDate}`));

    // 2c. trip name div
    let titleDiv = document.createElement(`div`);
    titleDiv.className = `tripName cel`;
    let titleAnchor = document.createElement(`a`);
    titleAnchor.target = `_blank`;
    titleAnchor.href = `${trip.uri}`;
    titleAnchor.innerText = `${trip.title}`;
    titleDiv.appendChild(titleAnchor);

    // 2d. trip activity
    let activityDiv = document.createElement(`div`);
    activityDiv.className = `tripActivity cel`;
    activityDiv.appendChild(document.createTextNode(`${trip.activity}`));

    // 3. append #2 divs to row div
    tripRow.appendChild(startDiv);
    tripRow.appendChild(endDiv);
    tripRow.appendChild(titleDiv);
    tripRow.appendChild(activityDiv);

    // 4. append trip row div to trip body div
    document.getElementById(`tripsBody`).appendChild(tripRow);
}

function createTrips(albums) {
    let currentYear = ``;

    albums.forEach((trip, index) => {
        // new year? create a row for the year only
        if (trip.startDate.getFullYear() !== currentYear) {
            currentYear = trip.startDate.getFullYear();
            createYearRow(currentYear);
        }

        // create a row for the trip
        createTripRow(trip, index);
    });
}

function resetTrips(trips) {
    document.getElementById(`tripsBody`).innerHTML = ``;
    createTrips(trips);
}