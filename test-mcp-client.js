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
    
    User ||--o{ Order : places
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
        return customCode
    }

    return diagramTypes[type] || diagramTypes.flowchart
}

// Reusable function to render diagram and save file
async function renderAndSaveDiagram(client, mermaidCode, options = {}) {
    const {
        format = 'png',
        theme = 'default',
        backgroundColor = '#ffffff',
        quality = 90,
        filePath = null,
        testName = 'diagram'
    } = options

    console.log(`\n🎨 Testing ${testName} (${format.toUpperCase()})...`)
    console.log('Mermaid code:')
    console.log(mermaidCode)

    const toolArguments = {
        mermaidCode,
        format,
        theme,
        backgroundColor,
        quality
    }

    if (filePath !== null) {
        toolArguments.filePath = filePath
    }

    const renderResult = await client.callTool({
        name: 'render_diagram',
        arguments: toolArguments
    })

    console.log(`✅ ${testName} result received!`)

    if (renderResult.content[0].text) {
        const resultData = JSON.parse(renderResult.content[0].text)
        if (resultData.success && resultData.data) {
            const fileName = filePath || `test-diagram-${testName}.${format}`
            const outputPath = join(process.cwd(), fileName)

            if (format === 'svg') {
                console.log(`💾 Saving ${testName} to:`, outputPath)
                writeFileSync(outputPath, resultData.data)
            } else {
                const imageBuffer = Buffer.from(resultData.data, 'base64')
                console.log(`💾 Saving ${testName} to:`, outputPath)
                writeFileSync(outputPath, imageBuffer)
            }

            console.log(`✅ ${testName} saved successfully!`)
            return { success: true, path: outputPath }
        }
    }

    return { success: false }
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
        console.log('Available tools:', tools.tools.map(t => t.name))
        console.log()

        // Test 1: Flowchart diagram
        const flowchartCode = getMermaidCode('flowchart')
        await renderAndSaveDiagram(client, flowchartCode, {
            format: 'png',
            theme: 'dark',
            backgroundColor: '#1a1a1a',
            filePath: 'test-diagram-flowchart.png',
            testName: 'flowchart'
        })

        // Test 2: Sequence diagram
        const sequenceCode = getMermaidCode('sequence')
        await renderAndSaveDiagram(client, sequenceCode, {
            format: 'jpg',
            theme: 'default',
            quality: 95,
            backgroundColor: '#ffffff',
            testName: 'sequence'
        })

        // Test 3: Class diagram
        const classCode = getMermaidCode('class')
        await renderAndSaveDiagram(client, classCode, {
            format: 'svg',
            theme: 'forest',
            testName: 'class'
        })

        // Test 4: State diagram
        const stateCode = getMermaidCode('state')
        await renderAndSaveDiagram(client, stateCode, {
            format: 'png',
            theme: 'default',
            backgroundColor: '#f8f9fa',
            testName: 'state'
        })

        // Test 5: Entity Relationship diagram
        const erCode = getMermaidCode('er')
        await renderAndSaveDiagram(client, erCode, {
            format: 'jpg',
            theme: 'forest',
            quality: 90,
            testName: 'er'
        })

        // Test 6: XY Chart
        const xyChartCode = getMermaidCode('xychart')
        await renderAndSaveDiagram(client, xyChartCode, {
            format: 'png',
            theme: 'dark',
            backgroundColor: '#2d3748',
            testName: 'xychart'
        })

        // Test 7: Git Graph
        const gitGraphCode = getMermaidCode('gitgraph')
        await renderAndSaveDiagram(client, gitGraphCode, {
            format: 'svg',
            theme: 'default',
            testName: 'gitgraph'
        })

        // Test 8: User Journey
        const journeyCode = getMermaidCode('journey')
        await renderAndSaveDiagram(client, journeyCode, {
            format: 'jpg',
            theme: 'forest',
            quality: 85,
            testName: 'journey'
        })

        // Test 9: Pie Chart
        const pieChartCode = getMermaidCode('piechart')
        await renderAndSaveDiagram(client, pieChartCode, {
            format: 'png',
            theme: 'dark',
            backgroundColor: '#ffffff',
            testName: 'piechart'
        })

        // Test 10: Flowchart with config
        const flowchartConfigCode = getMermaidCode('flowchartConfig')
        await renderAndSaveDiagram(client, flowchartConfigCode, {
            format: 'png',
            theme: 'default',
            backgroundColor: '#ffffff',
            testName: 'flowchartConfig'
        })

        console.log('\n🎉 All tests completed successfully!')
        console.log('\n📁 Generated files:')
        console.log('- test-diagram-flowchart.png (Flowchart - PNG)')
        console.log('- test-diagram-sequence.jpg (Sequence diagram - JPG)')
        console.log('- test-diagram-class.svg (Class diagram - SVG)')
        console.log('- test-diagram-state.png (State diagram - PNG)')
        console.log('- test-diagram-er.jpg (ER diagram - JPG)')
        console.log('- test-diagram-xychart.png (XY Chart - PNG)')
        console.log('- test-diagram-gitgraph.svg (Git Graph - SVG)')
        console.log('- test-diagram-journey.jpg (User Journey - JPG)')
        console.log('- test-diagram-piechart.png (Pie Chart - PNG)')
        console.log('- test-diagram-flowchartConfig.png (Flowchart with Config - PNG)')

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