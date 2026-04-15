
import { StackItem, ComponentItem, LayoutManager } from './src/tulweb.js'

async function runTest() {
    const container = document.createElement('div')
    const layoutManager = new LayoutManager(null, container)

    const stack = new StackItem({ type: 'stack' }, layoutManager)
    const child1 = new ComponentItem({ type: 'component', title: 'A' }, layoutManager)
    const child2 = new ComponentItem({ type: 'component', title: 'B' }, layoutManager)
    const child3 = new ComponentItem({ type: 'component', title: 'C' }, layoutManager)
    const child4 = new ComponentItem({ type: 'component', title: 'D' }, layoutManager)

    stack.addChild(child1)
    stack.addChild(child2)
    stack.addChild(child3)
    stack.addChild(child4)

    console.log('--- Initial State ---')
    console.log('Children:', stack.children.map(c => c.config.title).join(', '))
    
    // Case 1: Remove active tab from middle (should favor PREVIOUS)
    console.log('\nCase 1: Removing active tab C (index 2) from [A, B, C, D]')
    stack.activeChildIndex = 2 // C
    stack.removeChild(child3)
    console.log('Resulting active tab:', stack.children[stack.activeChildIndex].config.title)
    if (stack.children[stack.activeChildIndex].config.title === 'B') {
        console.log('SUCCESS: Activated tab BEFORE (B)')
    } else {
        console.log('FAILURE: Activated tab AFTER or OTHER (' + stack.children[stack.activeChildIndex].config.title + ')')
    }

    // Case 2: Remove active tab from start (should favor AFTER)
    console.log('\nCase 2: Removing active tab A (index 0) from [A, B, D]')
    stack.activeChildIndex = 0 // A
    stack.removeChild(child1)
    console.log('Resulting active tab:', stack.children[stack.activeChildIndex].config.title)
    if (stack.children[stack.activeChildIndex].config.title === 'B') {
        console.log('SUCCESS: Activated tab AFTER (B) since no tab before existed')
    } else {
        console.log('FAILURE: Activated wrong tab')
    }
}

// In JSDOM or browser
runTest().catch(console.error)
