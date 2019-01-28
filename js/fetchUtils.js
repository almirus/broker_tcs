'use strict';

export function parseJSON(response) {
    return response.json()
}
export function onlySuccess(response) {
    if (response.status === "Ok" || (response.status >= 200 && response.status < 300)) {
        return response
    } else {
        const error = new Error(response.statusText);
        error.response = response;
        throw error
    }
}