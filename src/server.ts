import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import { renderMermaidTool } from './tools/render-diagram.js'
import { renderPlotlyTool } from './tools/render-plotly.js'
import { config, logger } from './config.js'
import { FileManager } from './utils/file-manager.js'

async function createMcpServer() {
    const server = new McpServer({
        name: 'diagram-mcp',
        version: '1.0.0',
    })

    server.tool(
        renderMermaidTool.name,
        renderMermaidTool.description,
        renderMermaidTool.inputSchema.shape,
        { title: 'Render Mermaid Diagram' },
        async (params) => {
            try {
                const result = await renderMermaidTool.execute(params)
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: error instanceof Error ? error.message : 'Unknown error',
                                format: params.format || 'svg'
                            }, null, 2),
                        },
                    ],
                }
            }
        }
    )

    server.tool(
        renderPlotlyTool.name,
        renderPlotlyTool.description,
        renderPlotlyTool.inputSchema.shape,
        { title: 'Render Plotly Chart' },
        async (params) => {
            try {
                const result = await renderPlotlyTool.execute(params)
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: error instanceof Error ? error.message : 'Unknown error',
                                format: params.format || 'svg'
                            }, null, 2),
                        },
                    ],
                }
            }
        }
    )

    return server
}

let httpServer: any = null

async function startHttpServer(transportType: 'http' | 'stdio') {
    const app = express()
    app.use(express.json())
    if (transportType === 'http') {
        app.post('/mcp', async (req, res) => {
            try {
                const server = await createMcpServer()
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: undefined,
                })

                res.on('close', () => {
                    logger.info('Request closed')
                    transport.close()
                    server.close()
                })

                await server.connect(transport)
                await transport.handleRequest(req, res, req.body)
            } catch (error) {
                logger.error('Error handling MCP request:', error as Error)
                if (!res.headersSent) {
                    res.status(500).json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32603,
                            message: 'Internal server error',
                        },
                        id: null,
                    })
                }
            }
        })

        app.get('/mcp', async (req, res) => {
            logger.info('Received GET MCP request')
            res.status(405).json({
                jsonrpc: "2.0",
                error: {
                    code: -32000,
                    message: "Method not allowed."
                },
                id: null
            })
        })

        app.delete('/mcp', async (req, res) => {
            logger.info('Received DELETE MCP request')
            res.status(405).json({
                jsonrpc: "2.0",
                error: {
                    code: -32000,
                    message: "Method not allowed."
                },
                id: null
            })
        })
    }
    app.get('/', (req, res) => {
        res.json({
            name: 'diagram-mcp',
            version: '1.0.0',
            description: 'Diagram MCP server',
            tools: [
                renderMermaidTool.name,
                renderPlotlyTool.name
            ],
            staticDir: config.staticDir,
            allowedDirs: config.allowedDirs,
            serverPort: config.serverPort,
            transportType: config.transportType
        })
    })

    app.use('/static', express.static(config.staticDir))

    return new Promise<void>((resolve, reject) => {
        httpServer = app.listen(config.serverPort, (error) => {
            if (error) {
                reject(error)
            }
            logger.info(`Server running on http://localhost:${config.serverPort}`)
            logger.info(`MCP HTTP server available at http://localhost:${config.serverPort}/mcp`)
            logger.info(`Static files available at http://localhost:${config.serverPort}`)
            resolve()
        })

        httpServer.on('error', (error: any) => {
            if (error.code === 'EADDRINUSE') {
                logger.warn(`Port ${config.serverPort} is already in use`)
            }
            reject(error)
        })
    })
}

async function startStdioServer() {
    const server = await createMcpServer()
    const transport = new StdioServerTransport()
    await server.connect(transport)
}

async function shutdown(signal: string) {
    logger.info(`Received ${signal}. Shutting down gracefully...`)

    if (httpServer) {
        httpServer.close(() => {
            logger.info('HTTP server closed')
            process.exit(0)
        })

        setTimeout(() => {
            logger.warn('Forced shutdown after timeout')
            process.exit(1)
        }, 5000)
    } else {
        process.exit(0)
    }
}

async function main() {
    try {
        await FileManager.cleanupTempDir()
    } catch (error) {
        logger.warn('Failed to cleanup temp directory on startup:', error as Error)
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGQUIT', () => shutdown('SIGQUIT'))

    if (config.transportType === 'http') {
        await startHttpServer(config.transportType)
    } else {
        await startHttpServer('stdio')
        await startStdioServer()
    }
}

main().catch((error) => {
    logger.error(error as Error, '[MCP Diagram Server] error')
    process.exit(1)
}) 