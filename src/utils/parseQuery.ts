import type { QueryParams } from "@types/QueryParams";

export default function parseQuery() {
	const queryString = window.location.search.substring(1)
	const query = {} as QueryParams;
	const pairs = queryString.split('&');
	for (let i = 0; i < pairs.length; i++) {
		const pair = pairs[i].split('=');
        const lastValue = query[decodeURIComponent(pair[0])]
        const newValue = (n => Number.isNaN(+n) ? n : +n)(decodeURIComponent(pair[1] || ''))
		query[decodeURIComponent(pair[0])] = 
            typeof lastValue === 'undefined' ?
                newValue :
                [
                    ...(Array.isArray(lastValue) ? lastValue : [lastValue]),
                    newValue,
                ];
	}
	return query;
}
