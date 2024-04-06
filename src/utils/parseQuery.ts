import type { QueryParams } from "@/types/QueryParams";

export default function parseQuery(allowMultiple = false) {
	const queryString = window.location.search.substring(1)
	const query = {} as QueryParams;
	const pairs = queryString.split('&');
	for (let i = 0; i < pairs.length; i++) {
		const pair = pairs[i].split('=');
		const lastValue = query[decodeURIComponent(pair[0])]
		const rawValue = decodeURIComponent((pair[1] || '').replace(/\+/g, " "))
		const newValue = Number.isNaN(+rawValue) ? rawValue : +rawValue
		query[decodeURIComponent(pair[0])] = 
			allowMultiple ?
				typeof lastValue === 'undefined' ?
					newValue :
					[
						...(Array.isArray(lastValue) ? lastValue : [lastValue]),
						newValue,
					]
				: newValue
	}
	return query;
}
