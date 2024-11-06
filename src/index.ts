import { createBrowserRouter, createMemoryRouter, DataStrategyFunction, DataStrategyMatch, RouteObject } from "react-router-dom";

type RouterOptions = Parameters<typeof createBrowserRouter>[1] | Parameters<typeof createMemoryRouter>[1];
type createRouterArgs = [RouteObject[], RouterOptions];
type RouterDecorator = (...args: createRouterArgs) => createRouterArgs;

type DataFunctionValue = Response | NonNullable<unknown> | null;
type DataFunctionReturnValue = Promise<DataFunctionValue> | DataFunctionValue;

function fillLoader(route: RouteObject): RouteObject {
    return Object.assign({}, route, {
        loader: route.loader ?? true,
        children: route.children?.map(fillLoader),
    });
}

function loadAllRoutesWithSignal(createSignal: (match: DataStrategyMatch) => AbortSignal, matches: DataStrategyMatch[]) {
    return Promise.all(matches
        .map((match) => {
            const signal = createSignal(match);
            return match.resolve((handler: (ctx?: unknown) => DataFunctionReturnValue) => {
                return handler({ signal })
            })
        }));
}

function createSignalForMatch(ctrlMap: Map<string, AbortController>, match: DataStrategyMatch, signal: AbortSignal) {
    const ctrl = new AbortController();
    ctrlMap.set(match.route.id, ctrl);
    return AbortSignal.any([signal, ctrl.signal])
}

function abortForRoute(ctrlMap: Map<string, AbortController>, routeId: string) {
    ctrlMap.get(routeId)?.abort();
    ctrlMap.delete(routeId);
}

function abortOldControllers(ctrlMap: Map<string, AbortController>, matches: DataStrategyMatch[]) {
    const matchRouteIds = new Set<string>(
        matches.map((m) => m.route.id)
    );
    const ctrlsToRemove = Array.from(ctrlMap.keys()).filter(
        (k) => !matchRouteIds.has(k)
    );
    ctrlsToRemove.forEach((k) => {
        abortForRoute(ctrlMap, k);
    });
}

export function createSignalRouterDecorator(signal: AbortSignal): RouterDecorator {
    const ctrlMap = new Map<string, AbortController>();

    return function (routes: RouteObject[], options: RouterOptions) {
        return [
            routes.map(fillLoader),
            Object.assign({}, options, {
                dataStrategy: async function ({ matches }: { matches: DataStrategyMatch[] }) {
                    abortOldControllers(ctrlMap, matches)

                    const matchesToLoad = matches.filter((m) => m.shouldLoad)
                    const results = await loadAllRoutesWithSignal((match) => createSignalForMatch(ctrlMap, match, signal), matchesToLoad)

                    return results.reduce(
                        (acc: Record<string, unknown>, result: unknown, i: number) =>
                            Object.assign(acc, {
                                [matchesToLoad[i].route.id]: result,
                            }),
                        {}
                    );
                } as DataStrategyFunction,
            }),
        ];
    };
}
