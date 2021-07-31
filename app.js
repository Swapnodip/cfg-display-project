import data from "./data.js"

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

    elements: data.nodes.concat(data.edges)
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

  var g=parseInt(data.nodes[data.nodes.length-1].data.id.substring(1))+1

  document.getElementById("group").addEventListener("click", ()=>{
    const members=cy.nodes(":selected")
    if(members.length==0)
    return
    const oldparent=members[0].data("parent")
    let valid=true
    members.forEach(n => {
      if(n.data("parent")!=oldparent)
      {
        alert("Cannot make group")
        valid=false
        return
      }
    });
    if(!valid)
    return
    cy.add({"data":{"id":"g"+g,"name":"group"+g, "label":"parent group", "colour":members[0].data("colour"), "parent":oldparent}})
    members.move({parent:"g"+g})
    g=g+1
  });
