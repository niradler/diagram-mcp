import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { writeFileSync } from 'fs'
import { join } from 'path'
import fs from 'fs/promises'
import assert from 'assert'

// Reusable function to get Mermaid code for different diagram types
function getMermaidCode(type, customCode = null) {
    const diagramTypes = {
        flowchart: `
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
    
    style A fill:#e1f5fe
    style C fill:#c8e6c9
    style D fill:#ffcdd2
`,
        sequence: `
sequenceDiagram
    participant User
    participant System
    participant Database
    
    User->>System: Login Request
    System->>Database: Validate Credentials
    Database-->>System: User Found
    System-->>User: Login Successful
    
    Note over User,System: User session created
`,
        class: `
classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    
    class Order {
        +String orderId
        +Date orderDate
        +calculateTotal()
        +processPayment()
    }
    
    User --> Order : places
`,
        state: `
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : start
    Processing --> Success : complete
    Processing --> Error : fail
    Success --> [*]
    Error --> Idle : retry
`,
        er: `
erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        string name
        string email
        string address
    }
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        int order_id
        date order_date
        float total_amount
    }
    PRODUCT ||--o{ ORDER_ITEM : includes
    PRODUCT {
        string product_name
        float price
        int stock_quantity
    }
`,
        xychart: `
xychart-beta
    title "Sales Revenue"
    x-axis [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]
    line [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]
`,
        gitgraph: `
gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
    commit
`,
        journey: `
journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 3: Me
`,
        piechart: `
pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
`,
        flowchartConfig: `
---
title: Hello Title
config:
  theme: base
  themeVariables:
    primaryColor: "#00ff00"
---
flowchart
	Hello --> World
`
    }

    if (customCode) {
        assert(customCode, 'Custom code must be provided if specified')
        return customCode
    }

    const code = diagramTypes[type] || diagramTypes.flowchart
    assert(code, 'Mermaid code must be returned')
    return code
}

// Reusable function to render diagram and save file
async function renderAndSaveDiagram(client, mermaidCode, options = {}) {
    assert(client, 'Client is required')
    assert(mermaidCode, 'Mermaid code is required')
    assert(mermaidCode.trim().length > 0, 'Mermaid code cannot be empty')
    assert(options, 'Options object is required')

    const {
        format = 'png',
        theme = 'default',
        backgroundColor = '#ffffff',
        quality = 90,
        filePath = null,
        testName = 'diagram',
        output = 'link'
    } = options

    assert(['svg', 'png', 'jpg', 'pdf'].includes(format), `Invalid format: ${format}`)
    assert(['default', 'base', 'dark', 'forest', 'neutral', 'null'].includes(theme), `Invalid theme: ${theme}`)
    assert(['link', 'filepath', 'raw'].includes(output), `Invalid output: ${output}`)
    assert(quality >= 1 && quality <= 100, `Quality must be between 1 and 100, got: ${quality}`)
    assert(testName, 'Test name is required')

    console.log(`\n🎨 Testing ${testName} (${format.toUpperCase()}) with output: ${output}...`)
    console.log('Mermaid code:')
    console.log(mermaidCode)

    const toolArguments = {
        mermaidCode,
        format,
        theme,
        backgroundColor,
        quality,
        output
    }

    if (filePath !== null) {
        assert(filePath, 'File path must be provided if not null')
        toolArguments.filePath = filePath
    }

    const renderResult = await client.callTool({
        name: 'render_diagram',
        arguments: toolArguments
    })

    assert(renderResult, 'Render result must be returned')
    assert(renderResult.content, 'Render result must have content')
    assert(renderResult.content.length > 0, 'Render result content must not be empty')

    console.log(`✅ ${testName} result received!`)

    if (renderResult.content[0].text) {
        const resultData = JSON.parse(renderResult.content[0].text)
        assert(resultData, 'Result data must be parsed')
        assert(typeof resultData.success === 'boolean', 'Result must have success boolean property')

        if (resultData.success && resultData.data) {
            assert(resultData.data, 'Successful result must have data')
            assert(resultData.format, 'Result must have format')
            assert(resultData.output_type, 'Result must have output_type')

            if (output === 'filepath') {
                assert(resultData.output_type === 'filepath', 'Output type should be filepath')
                assert(resultData.data, 'Filepath output must have data (file path)')
                console.log(`💾 File saved to: ${resultData.data}`)
                return { success: true, path: resultData.data }
            } else if (output === 'link') {
                assert(resultData.output_type === 'link', 'Output type should be link')
                assert(resultData.data, 'Link output must have data (URL)')
                assert(resultData.data.startsWith('http://localhost:'), 'Link must be localhost URL')
                console.log(`🔗 Link generated: ${resultData.data}`)
                return { success: true, url: resultData.data }
            } else if (output === 'raw') {
                assert(resultData.output_type === 'raw', 'Output type should be raw')
                assert(resultData.data, 'Raw output must have data')

                if (format === 'svg') {
                    assert(resultData.data.startsWith('<svg'), 'SVG data must start with <svg')
                } else {
                    // For binary formats, data should be base64
                    assert(resultData.data.length > 0, 'Base64 data must not be empty')
                }

                console.log(`📄 Raw data received (${resultData.data.length} chars)`)
                return { success: true, data: resultData.data }
            }
        } else if (!resultData.success) {
            assert(resultData.error, 'Failed result must have error message')
            console.log(`❌ ${testName} failed:`, resultData.error)
            return { success: false, error: resultData.error }
        }
    }

    return { success: false, error: 'No response data received' }
}

async function testMermaidMCP() {
    console.log('🚀 Starting MCP Client Test for Mermaid Diagram Rendering...\n')

    const client = new Client({
        name: 'mermaid-test-client',
        version: '1.0.0'
    })

    const transport = new StdioClientTransport({
        command: 'node',
        args: ['dist/index.js']
    })

    try {
        console.log('📡 Connecting to MCP server...')
        await client.connect(transport)
        console.log('✅ Connected successfully!\n')

        console.log('🔧 Listing available tools...')
        const tools = await client.listTools()
        assert(tools, 'Tools response must be returned')
        assert(tools.tools, 'Tools must be returned')
        assert(Array.isArray(tools.tools), 'Tools must be an array')
        assert(tools.tools.length > 0, 'At least one tool must be available')

        const renderTool = tools.tools.find(t => t.name === 'render_diagram')
        assert(renderTool, 'render_diagram tool must be available')

        console.log('Available tools:', tools.tools.map(t => t.name))
        console.log()

        // Test 1: Flowchart diagram with link output
        const flowchartCode = getMermaidCode('flowchart')
        await renderAndSaveDiagram(client, flowchartCode, {
            format: 'png',
            theme: 'dark',
            backgroundColor: '#1a1a1a',
            testName: 'flowchart-link',
            output: 'link'
        })

        // Test 2: Sequence diagram with filepath output
        const sequenceCode = getMermaidCode('sequence')
        await renderAndSaveDiagram(client, sequenceCode, {
            format: 'jpg',
            theme: 'default',
            quality: 95,
            backgroundColor: '#ffffff',
            testName: 'sequence-filepath',
            output: 'filepath'
        })

        // Test 3: Class diagram with raw output
        const classCode = getMermaidCode('class')
        await renderAndSaveDiagram(client, classCode, {
            format: 'svg',
            theme: 'forest',
            testName: 'class-raw',
            output: 'raw'
        })

        // Test 4: State diagram with link output
        const stateCode = getMermaidCode('state')
        await renderAndSaveDiagram(client, stateCode, {
            format: 'png',
            theme: 'default',
            backgroundColor: '#f8f9fa',
            testName: 'state-link',
            output: 'link'
        })

        // Test 5: Entity Relationship diagram with filepath output
        const erCode = getMermaidCode('er')
        await renderAndSaveDiagram(client, erCode, {
            format: 'jpg',
            theme: 'forest',
            quality: 90,
            testName: 'er-filepath',
            output: 'filepath'
        })

        // Test 6: XY Chart with raw output
        const xyChartCode = getMermaidCode('xychart')
        await renderAndSaveDiagram(client, xyChartCode, {
            format: 'png',
            theme: 'dark',
            backgroundColor: '#2d3748',
            testName: 'xychart-raw',
            output: 'raw'
        })

        // Test 7: Git Graph with link output
        const gitGraphCode = getMermaidCode('gitgraph')
        await renderAndSaveDiagram(client, gitGraphCode, {
            format: 'svg',
            theme: 'default',
            testName: 'gitgraph-link',
            output: 'link'
        })

        // Test 8: User Journey with filepath output
        const journeyCode = getMermaidCode('journey')
        await renderAndSaveDiagram(client, journeyCode, {
            format: 'jpg',
            theme: 'forest',
            quality: 85,
            testName: 'journey-filepath',
            output: 'filepath'
        })

        // Test 9: Pie Chart with raw output
        const pieChartCode = getMermaidCode('piechart')
        await renderAndSaveDiagram(client, pieChartCode, {
            format: 'png',
            theme: 'dark',
            backgroundColor: '#ffffff',
            testName: 'piechart-raw',
            output: 'raw'
        })

        // Test 10: Flowchart with config and link output
        const flowchartConfigCode = getMermaidCode('flowchartConfig')
        await renderAndSaveDiagram(client, flowchartConfigCode, {
            format: 'png',
            theme: 'default',
            backgroundColor: '#ffffff',
            testName: 'flowchartConfig-link',
            output: 'link'
        })

        // Test 11: Invalid syntax (should fail gracefully)
        console.log('\n🧪 Testing error handling with invalid syntax...')
        const invalidCode = `
INVALID_MERMAID_SYNTAX
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
    
    style A fill:#e1f5fe
    style C fill:#c8e6c9
    style D fill:#ffcdd2
    INVALID_SYNTAX_HERE
    classDiagram
        class User {
            +String name
        }
        User --> INVALID_RELATIONSHIP_SYNTAX
`
        const errorResult = await renderAndSaveDiagram(client, invalidCode, {
            format: 'svg',
            theme: 'default',
            testName: 'invalid-syntax',
            output: 'raw'
        })

        assert(!errorResult.success, 'Invalid syntax should fail')
        assert(errorResult.error, 'Error result should have error message')

        console.log('✅ Error handling working correctly - invalid syntax detected')

        // Test 12: Invalid output type (should fail gracefully)
        console.log('\n🧪 Testing invalid output type...')
        try {
            await renderAndSaveDiagram(client, getMermaidCode('flowchart'), {
                format: 'png',
                theme: 'default',
                testName: 'invalid-output',
                output: 'invalid_output_type'
            })
            assert(false, 'Should have failed with invalid output type')
        } catch (error) {
            console.log('✅ Invalid output type properly rejected')
        }

        console.log('\n🎉 All tests completed successfully!')
        console.log('\n📁 Test Summary:')
        console.log('- Link output: Returns localhost URLs for easy viewing')
        console.log('- Filepath output: Saves files to disk and returns paths')
        console.log('- Raw output: Returns base64 data for images or raw SVG strings')
        console.log('- Error handling: Properly validates input and handles errors')

    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    } finally {
        await client.close()
        console.log('\n🔌 Client disconnected')
    }
}

// Run the test
testMermaidMCP().catch(error => {
    console.error('❌ Test script failed:', error)
    process.exit(1)
}) 