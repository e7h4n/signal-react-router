import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouteObject } from "react-router-dom";
import { createSignalRouterDecorator } from "..";

function renderRoutes(routes: RouteObject[]): { abortController: AbortController, router: ReturnType<typeof createMemoryRouter> } {
    const abortController = new AbortController();

    const decorateRoutes = createSignalRouterDecorator(
        abortController.signal
    );

    const router = createMemoryRouter(...decorateRoutes(routes, {
        basename: "/",
    }));

    return { abortController, router }
}

describe("signalRouter", () => {
    let rootAbortController: AbortController;

    afterEach(() => {
        rootAbortController.abort();
    });

    it("pass a new abort signal to each loader", () => {
        const trace = vi.fn()
        const { abortController } = renderRoutes([{
            path: "/",
            loader: (_: unknown, ctx) => {
                trace((ctx as { signal: AbortSignal }).signal)
                return null;
            }
        }])
        rootAbortController = abortController

        expect(trace).toBeCalledTimes(1)
        expect(trace.mock.calls[0][0]).toBeInstanceOf(AbortSignal)
        expect(trace.mock.calls[0][0]).not.equal(abortController.signal)
    });

    it("abort previous signal when navigating", async () => {
        const trace = vi.fn()
        const { abortController, router } = renderRoutes([{
            path: "/",
            loader: (_: unknown, ctx) => {
                (ctx as { signal: AbortSignal }).signal.addEventListener('abort', trace)
                return null;
            }
        }, {
            path: "/user",
        }])

        rootAbortController = abortController

        expect(trace).not.toBeCalled()

        await router.navigate("/user")

        expect(trace).toBeCalled()
    })

    it("keep parent signal not aborted when switch between child routes", async () => {
        const traceAbortSignal = vi.fn()
        const { abortController, router } = renderRoutes([{
            path: "/A1",
            loader: (_: unknown, ctx) => {
                (ctx as { signal: AbortSignal }).signal.addEventListener('abort', () => {
                    traceAbortSignal('A1')
                })
                return null;
            },
            children: [{
                path: "A1B1",
                loader: (_: unknown, ctx) => {
                    (ctx as { signal: AbortSignal }).signal.addEventListener('abort', () => {
                        traceAbortSignal('A1B1')
                    })
                    return null;
                }
            }, {
                path: "A1B2"
            }]
        }])

        rootAbortController = abortController

        await router.navigate("/A1")
        expect(traceAbortSignal).not.toBeCalled()
        await router.navigate("/A1/A1B1")
        expect(traceAbortSignal).not.toBeCalled()
        await router.navigate("/A1/A1B2")
        expect(traceAbortSignal).not.toHaveBeenCalledWith('A1')
        expect(traceAbortSignal).toHaveBeenCalledWith('A1B1')
    })

    it("abort all parent when navigate to another sibling route", async () => {
        const traceAbortSignal = vi.fn()
        const { abortController, router } = renderRoutes([{
            path: "/A1",
            loader: (_: unknown, ctx) => {
                (ctx as { signal: AbortSignal }).signal.addEventListener('abort', () => {
                    traceAbortSignal('A1')
                })
                return null;
            },
            children: [{
                path: "A1B1",
                loader: (_: unknown, ctx) => {
                    (ctx as { signal: AbortSignal }).signal.addEventListener('abort', () => {
                        traceAbortSignal('A1B1')
                    })
                    return null;
                }
            }]
        }, {
            path: "/A2"
        }])

        rootAbortController = abortController

        await router.navigate("/A1/A1B1")
        await router.navigate("/A2")
        expect(traceAbortSignal).toBeCalledTimes(2)
        expect(traceAbortSignal).toHaveBeenCalledWith('A1B1')
        expect(traceAbortSignal).toHaveBeenCalledWith('A1')
    })
});
