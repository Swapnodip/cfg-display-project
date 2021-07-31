let raw;
await fetch(
  //'./json/DMX2Alloc_ch_79_ajtg.json'
  './json/Linefit_ccp_28_ajtg.json'
  )
.then(response => {
	return response.json()
})
.then(data => {raw=data})
//console.log(raw)
let nodes=raw.objects.map(node=>({"data":{"id":"n"+node._gvid, "name":node.name, "label":node.label, "colour":node.label.substring(16,23)},"group":"nodes"}))
let edges=raw.edges.map(edge=>({"data":{"id":"e"+edge._gvid, "source":"n"+edge.tail, "target":"n"+edge.head},"group":"edges"}))
let i=0
nodes.push({"data":{"id":"g0","name":"group0", "label":"parent group", "colour":nodes[0].data.colour}, "group":"nodes"})
nodes[0].data.parent="g0"
raw.edges.forEach(e => {
	if(nodes[e.tail].data.colour==nodes[e.head].data.colour)
	{
		nodes[e.head].data.parent=nodes[e.tail].data.parent
	}
	else
	{
		i=i+1
		nodes.push({"data":{"id":"g"+i,"name":"group"+i, "label":"parent group", "colour":nodes[e.head].data.colour}, "group":"nodes"})
		nodes[e.head].data.parent="g"+i
	}
})
//let data=nodes.concat(edges)
//console.log(nodes)
export default {nodes, edges}