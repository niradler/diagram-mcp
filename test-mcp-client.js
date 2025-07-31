import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

async function testMermaidMCP() {
    console.log('🚀 Starting MCP Client Test for Mermaid Diagram Rendering...\n')

    // Create MCP client
    const client = new Client({
        name: 'mermaid-test-client',
        version: '1.0.0'
    })

    // Create transport to connect to our server
    const transport = new StdioClientTransport({
        command: 'node',
        args: ['dist/index.js']
    })

    try {
        // Connect to the server
        console.log('📡 Connecting to MCP server...')
        await client.connect(transport)
        console.log('✅ Connected successfully!\n')

        // List available tools
        console.log('🔧 Listing available tools...')
        const tools = await client.listTools()
        console.log('Available tools:', tools.tools.map(t => t.name))
        console.log()

        // Test Mermaid diagram
        const mermaidDiagram = `
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
    
    style A fill:#e1f5fe
    style C fill:#c8e6c9
    style D fill:#ffcdd2
`

        console.log('📊 Testing diagram rendering...')
        console.log('Mermaid code:')
        console.log(mermaidDiagram)

        // Test render_diagram tool
        console.log('\n🎨 Testing render_diagram tool...')
        const renderResult = await client.callTool({
            name: 'render_diagram',
            arguments: {
                mermaidCode: mermaidDiagram,
                format: 'png',
                theme: 'dark',
                backgroundColor: '#1a1a1a'
            }
        })

        console.log('✅ Render result received!')
        console.log('Result format:', renderResult.content[0].text ? 'Success' : 'Error')

        // Save the rendered image
        if (renderResult.content[0].text) {
            const resultData = JSON.parse(renderResult.content[0].text)
            if (resultData.success && resultData.data) {
                const imageBuffer = Buffer.from(resultData.data, 'base64')
                const imagePath = join(process.cwd(), 'test-diagram.png')

                console.log('💾 Saving image to:', imagePath)
                writeFileSync(imagePath, imageBuffer)
                console.log('✅ Image saved successfully!')

                // Comment out the cleanup for now so you can see the image
                // console.log('🧹 Cleaning up image...')
                // unlinkSync(imagePath)
                // console.log('✅ Image cleaned up!')

                console.log('\n📝 To clean up the image later, uncomment these lines:')
                console.log('// unlinkSync(imagePath)')
                console.log('// console.log("✅ Image cleaned up!")')
            }
        }

        // Test convert_to_image tool
        console.log('\n🖼️ Testing convert_to_image tool...')
        const convertResult = await client.callTool({
            name: 'convert_to_image',
            arguments: {
                mermaidCode: mermaidDiagram,
                format: 'jpg',
                theme: 'default',
                quality: 95,
                backgroundColor: '#ffffff'
            }
        })

        console.log('✅ Convert result received!')
        console.log('Result format:', convertResult.content[0].text ? 'Success' : 'Error')

        // Save the converted image
        if (convertResult.content[0].text) {
            const resultData = JSON.parse(convertResult.content[0].text)
            if (resultData.success && resultData.data) {
                const imageBuffer = Buffer.from(resultData.data, 'base64')
                const imagePath = join(process.cwd(), 'test-diagram-converted.jpg')

                console.log('💾 Saving converted image to:', imagePath)
                writeFileSync(imagePath, imageBuffer)
                console.log('✅ Converted image saved successfully!')

                // Comment out the cleanup for now so you can see the image
                // console.log('🧹 Cleaning up converted image...')
                // unlinkSync(imagePath)
                // console.log('✅ Converted image cleaned up!')

                console.log('\n📝 To clean up the converted image later, uncomment these lines:')
                console.log('// unlinkSync(imagePath)')
                console.log('// console.log("✅ Converted image cleaned up!")')
            }
        }

        // Test SVG rendering
        console.log('\n🎨 Testing SVG rendering...')
        const svgResult = await client.callTool({
            name: 'render_diagram',
            arguments: {
                mermaidCode: mermaidDiagram,
                format: 'svg',
                theme: 'forest'
            }
        })

        console.log('✅ SVG result received!')
        if (svgResult.content[0].text) {
            const resultData = JSON.parse(svgResult.content[0].text)
            if (resultData.success && resultData.data) {
                const svgPath = join(process.cwd(), 'test-diagram.svg')

                console.log('💾 Saving SVG to:', svgPath)
                writeFileSync(svgPath, resultData.data)
                console.log('✅ SVG saved successfully!')

                // Comment out the cleanup for now so you can see the SVG
                // console.log('🧹 Cleaning up SVG...')
                // unlinkSync(svgPath)
                // console.log('✅ SVG cleaned up!')

                console.log('\n📝 To clean up the SVG later, uncomment these lines:')
                console.log('// unlinkSync(svgPath)')
                console.log('// console.log("✅ SVG cleaned up!")')
            }
        }

        console.log('\n🎉 All tests completed successfully!')
        console.log('\n📁 Generated files:')
        console.log('- test-diagram.png (PNG from render_diagram)')
        console.log('- test-diagram-converted.jpg (JPG from convert_to_image)')
        console.log('- test-diagram.svg (SVG from render_diagram)')

    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    } finally {
        // Close the client
        await client.close()
        console.log('\n🔌 Client disconnected')
    }
}

// Run the test
testMermaidMCP().catch(error => {
    console.error('❌ Test script failed:', error)
    process.exit(1)
}) 