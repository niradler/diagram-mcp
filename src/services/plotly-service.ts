import puppeteer, { Browser, ScreenshotOptions } from 'puppeteer'
import assert from 'assert'
import { RenderPlotlyRequest, DiagramResult } from '../types'

export class PlotlyService {
    private browser: Browser | null = null

    async initialize() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            })
            assert(this.browser, 'Browser must be initialized')
        }
    }

    async renderPlotly(request: RenderPlotlyRequest): Promise<DiagramResult> {
        try {
            assert(request, 'Request is required')
            assert(request.plotlyCode, 'Plotly code is required')
            assert(request.plotlyCode.trim().length > 0, 'Plotly code cannot be empty')
            assert(['svg', 'png', 'jpg', 'pdf'].includes(request.format), `Invalid format: ${request.format}`)

            await this.initialize()
            assert(this.browser, 'Browser must be initialized')

            const {
                plotlyCode,
                format,
                backgroundColor,
                width,
                height,
                quality,
                filePath,
                responsive,
                displayModeBar,
                modeBarButtonsToRemove,
                displaylogo
            } = request

            if (width !== undefined) {
                assert(width > 0, `Width must be positive, got: ${width}`)
            }

            if (height !== undefined) {
                assert(height > 0, `Height must be positive, got: ${height}`)
            }

            if (quality !== undefined) {
                assert(quality >= 1 && quality <= 100, `Quality must be between 1 and 100, got: ${quality}`)
            }

            const page = await this.browser.newPage()
            assert(page, 'Page must be created')

            const plotlyConfig = {
                responsive: responsive !== undefined ? responsive : true,
                displayModeBar: displayModeBar !== undefined ? displayModeBar : false,
                modeBarButtonsToRemove: modeBarButtonsToRemove || [],
                displaylogo: displaylogo !== undefined ? displaylogo : false
            }

            if (!plotlyCode.includes("plotly-chart")) {
                throw new Error("Plotly must contain id 'plotly-chart'")
            }

            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.plot.ly/plotly-3.0.1.min.js"></script>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              background: ${backgroundColor || '#ffffff'}; 
              font-family: Arial, sans-serif;
            }
            .chart-container { 
              display: flex; 
              justify-content: center; 
              align-items: center;
              width: ${width || 'auto'};
              height: ${height || 'auto'};
            }
            #plotly-chart {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div class="chart-container">
            <div id="plotly-chart"></div>
          </div>
          <script>
            const config = ${JSON.stringify(plotlyConfig)};
            ${plotlyCode}
          </script>
        </body>
        </html>
      `

            await page.setContent(html)

            const renderResult = await page.waitForFunction(() => {
                const chart = document.querySelector('#plotly-chart .plotly');
                const errorElement = document.querySelector('.error-text');
                return {
                    hasChart: chart !== null,
                    hasError: errorElement !== null,
                    errorText: errorElement ? errorElement.textContent : null
                };
            }, { timeout: 15000 });

            const result = await renderResult.jsonValue() as { hasChart: boolean; hasError: boolean; errorText: string | null };
            assert(result, 'Render result must be returned')
            assert(typeof result.hasChart === 'boolean', 'hasChart must be boolean')
            assert(typeof result.hasError === 'boolean', 'hasError must be boolean')

            if (result.hasError) {
                assert(result.errorText, 'Error text must be provided when hasError is true')
                throw new Error(`Plotly syntax error: ${result.errorText || 'Unknown syntax error'}`);
            }

            if (format === 'svg') {
                const svgElement = await page.$('#plotly-chart svg');
                assert(svgElement, 'SVG element must be found for SVG format')
                const svgContent = await page.evaluate((element) => element.outerHTML, svgElement);
                assert(svgContent, 'SVG content must be generated')
                await page.close();

                return {
                    success: true,
                    data: svgContent,
                    format: 'svg'
                }
            }

            const element = await page.$('.chart-container')
            assert(element, 'Chart element must be found')

            const boundingBox = await element.boundingBox()
            assert(boundingBox, 'Chart bounding box must be obtained')
            assert(boundingBox.width > 0, 'Bounding box width must be positive')
            assert(boundingBox.height > 0, 'Bounding box height must be positive')

            let buffer: Uint8Array

            if (format === 'pdf') {
                buffer = await page.pdf({
                    format: 'A4',
                    printBackground: true
                })
            } else {
                const screenshotOptions: ScreenshotOptions = {
                    type: format === 'jpg' ? 'jpeg' : 'png',
                    quality: format === 'jpg' ? (quality || 90) : undefined,
                    fullPage: false,
                    clip: {
                        x: boundingBox.x,
                        y: boundingBox.y,
                        width: width || boundingBox.width,
                        height: height || boundingBox.height
                    }
                }

                if (filePath) {
                    const extension = format === 'jpg' ? '.jpeg' : `.${format}`
                    const pathWithExtension = filePath.endsWith(extension) ? filePath : `${filePath}${extension}`
                    screenshotOptions.path = pathWithExtension as `${string}.png` | `${string}.jpeg` | `${string}.webp`
                }

                buffer = await page.screenshot(screenshotOptions)
            }

            assert(buffer, 'Buffer must be generated')
            assert(buffer.length > 0, 'Buffer must not be empty')

            await page.close()

            return {
                success: true,
                data: Buffer.from(buffer).toString('base64'),
                format: format,
                size: {
                    width: width || boundingBox.width,
                    height: height || boundingBox.height
                }
            }
        } catch (error) {
            assert(error, 'Error must be provided')
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            return {
                success: false,
                error: errorMessage,
                format: request.format
            }
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close()
            this.browser = null
        }
    }
} 