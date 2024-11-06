import { createBrowserRouter, createMemoryRouter, DataStrategyFunction, DataStrategyMatch, RouteObject } from "react-router-dom";

type RouterOptions = Parameters<typeof createBrowserRouter>[1] | Parameters<typeof createMemoryRouter>[1];
type createRouterArgs = [RouteObject[], RouterOptions];
type RouterDecorator = (...args: createRouterArgs) => createRouterArgs;

type DataFunctionValue = Response | NonNullable<unknown> | null;
type DataFunctionReturnValue = Promise<DataFunctionValue> | DataFunctionValue;

export function createSignalRouterDecorator(signal: AbortSignal): RouterDecorator {
    const ctrlMap = new Map<string, AbortController>();

    return function (routes: RouteObject[], options: RouterOptions) {
        const fillLoader = (route: RouteObject): RouteObject =>
            Object.assign({}, route, {
                loader: route.loader ?? true,
                children: route.children?.map(fillLoader),
            });

        return [
            routes.map(fillLoader),
            Object.assign({}, options, {
                dataStrategy: async function ({ matches }: { matches: DataStrategyMatch[] }) {
                    const matchRouteIds = new Set<string>(
                        matches.map((m) => m.route.id)
                    );
                    const ctrlsToRemove = Array.from(ctrlMap.keys()).filter(
                        (k) => !matchRouteIds.has(k)
                    );
                    ctrlsToRemove.forEach((k) => {
                        ctrlMap.get(k)?.abort();
                        ctrlMap.delete(k);
                    });

                    const matchesToLoad = matches.filter((m) => m.shouldLoad);
                    const results = await Promise.all(
                        matchesToLoad
                            .map((match) => {
                                const ctrl = new AbortController();
                                ctrlMap.set(match.route.id, ctrl);
                                const routeSignal = AbortSignal.any([
                                    signal,
                                    ctrl.signal,
                                ]);
                                return match.resolve((handler: (ctx?: unknown) => DataFunctionReturnValue) => {
                                    return handler({ signal: routeSignal })
                                })
                            })
                    );

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
