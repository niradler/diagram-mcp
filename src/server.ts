import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { renderDiagramTool } from './tools/render-diagram.js'

async function main() {
    const server = new McpServer({
        name: 'diagram-mcp',
        version: '1.0.0',
    })

    server.tool(
        renderDiagramTool.name,
        renderDiagramTool.description,
        renderDiagramTool.inputSchema.shape,
        { title: 'Render Diagram' },
        async (params) => {
            try {
                const result = await renderDiagramTool.execute(params)
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

    const transport = new StdioServerTransport()
    await server.connect(transport)
}

main().catch((error) => {
    console.error('Server error:', error)
    process.exit(1)
}) 