async function start()
{
let raw;
await fetch(
  './json/DMX2Alloc_ch_79_ajtg.json'
  //'./json/Linefit_ccp_28_ajtg.json'
  )
.then(response => {
	return response.json()
})
.then(data => {raw=data})
//console.log(raw)
let nodes=raw.objects.map(node=>({"data":{"id":"n"+node._gvid, "name":node.name, "label":node.label, "colour":node.label.substring(16,23)},"group":"nodes"}))
let edges=raw.edges.map(edge=>({"data":{"id":"e"+edge._gvid, "source":"n"+edge.tail, "target":"n"+edge.head},"group":"edges"}))
let gcount=0
nodes.push({"data":{"id":"g0","name":"group0", "label":"parent group", "colour":nodes[0].data.colour}, "group":"nodes"})
nodes[0].data.parent="g0"
raw.edges.forEach(e => {
	if(nodes[e.tail].data.colour==nodes[e.head].data.colour)
	{
		nodes[e.head].data.parent=nodes[e.tail].data.parent
	}
	else
	{
		gcount=gcount+1
		nodes.push({"data":{"id":"g"+gcount,"name":"group"+gcount, "label":"parent group", "colour":nodes[e.head].data.colour}, "group":"nodes"})
		nodes[e.head].data.parent="g"+gcount
	}
})

var cy = cytoscape({
    container: document.getElementById("cy"),
    layout: {
      name: "dagre",
      nodeSep: 100,
      rankSep: 20
    },
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(colour)",
          "text-valign":"center",
          "content": "data(name)"
        }
      },
      {
        selector: ":parent",
        style: {
          "background-opacity": 0.25,
          "text-valign":"top",
          "content":"",
          "padding": 16
        }
      },
      {
        selector: "node.cy-expand-collapse-collapsed-node",
        style: {
          "shape": "rectangle",
          "background-opacity": 0.5
        }
      },
      {
        selector: "edge",
        style: {
          "width": 2,
          "line-color": "#000000",
          "curve-style": "bezier",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "#000000"
        }
      },
      {
        selector: "edge.meta",
        style: {
          "width": 2,
          "line-color": "#000000"
        }
      },
      {
        selector: ":selected",
        style: {
          "overlay-color":"#999999",
          "overlay-opacity":0.3
        }
      }
    ],

    elements: nodes.concat(edges)
});

  var api = cy.expandCollapse({
    layoutBy: {
      name:"dagre",
      nodeSep: 100,
      rankSep: 20,
      animate: true,
      fit: true
    },
    fisheye: true,
    animate: true,
    undoable: false,
    expandCueImage: "./assets/icon-plus.png",
    collapseCueImage: "./assets/icon-minus.png",
    animationDuration:250,
  });

  cy.navigator({
    container: document.getElementById("cy")
  });


  var text=document.getElementById("node_data")
  var dropdown=document.getElementById("data_option")

  document.getElementById("collapse").addEventListener("click", () => {
    api.collapseAll()
    text.innerHTML=""
  });

  document.getElementById("expand").addEventListener("click", () => {
    api.expandAll()
  });

  var parameter=dropdown.value
  var selected={}

  cy.on('tap', event=>{
    text.innerHTML=event.target.data(parameter)?event.target.data(parameter):""
    selected=event.target
  });

  dropdown.addEventListener("change",event=>{
    parameter=event.target.value
    text.innerHTML=selected.data(parameter)?selected.data(parameter):""
  });

  document.getElementById("group").addEventListener("click", ()=>{
    const members=cy.nodes(":selected")
    if(members.length==0)
    return
    const oldparent=members[0].data("parent")
    let valid=true
    members.forEach(n => {
      if(n.data("parent")!=oldparent)
      {
        if(valid)alert("Cannot make group")
        valid=false
        return
      }
    });
    if(!valid)
    return
    gcount=gcount+1
    cy.add({"data":{"id":"g"+gcount,"name":"group"+gcount, "label":"parent group", "colour":members[0].data("colour"), "parent":oldparent}})
    members.move({parent:"g"+gcount})
  });
}

start();
