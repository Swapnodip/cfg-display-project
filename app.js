var raw = { "objects": [], "edges": [] };

document.getElementById("input_file").addEventListener("change", function () {
  var fr = new FileReader();
  fr.onload = function () {
    raw = JSON.parse(fr.result);
    start();
  };

  if (this.files[0].type != "application/json") alert("Please enter JSON file");
  else fr.readAsText(this.files[0]);
});

function start() {

  //Configuration
  const config=raw.config
  var entry_attr
  var exit_attr
  const label_list=config.node_label?config.node_label:["src","tgt"]
  if(config)
  {
    entry_attr=Object.keys(config.attributes).filter(a=>(config.attributes[a].group_rep=="entry"))
    exit_attr=Object.keys(config.attributes).filter(a=>(config.attributes[a].group_rep=="exit"))
  }
  else
  {
    exit_attr=["src_pointsTo_set","tgt_pointsTo_set"]
    entry_attr=["equality_set","src_stronglylive_set","tgt_stronglylive_set"]
  }

  //Setting up dropdown
  document.getElementById("data_option1").innerHTML=Object.keys(config?config.attributes:raw.objects[0]).map(k=>(
    "<option value="+k+">"+k+"</option>"
  ))
  document.getElementById("data_option2").innerHTML=document.getElementById("data_option1").innerHTML

  //Converting data
  let nodes = raw.objects.map((node) => ({
    data: node,
    group: "nodes",
  }));
  let edges = raw.edges.map((edge) => ({
    data: {
      id: "e" + edge._gvid,
      source: "n" + edge.tail,
      target: "n" + edge.head,
      colour: edge.color,
    },
    group: "edges",
  }));

  nodes.forEach(n=>{
    n.data.id="n"+n.data._gvid
    n.data.colour=n.data.matching?"#00ff00":"#ff0000"
    n.data.label=label_list.map(l=>(l.toUpperCase()+":\n"+n.data[l])).join("\n\n") //"SOURCE:\n"+n.data.src+"\n\nTARGET:\n"+n.data.tgt
  })

  var cy = cytoscape({
    container: document.getElementById("cy"),
    //Layout
    layout: {
      name: "dagre",
      nodeSep: 200,
      rankSep: 30,
    },
    //Style
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(colour)",
          "text-valign": "center",
          content: "data(label)",
          "compound-sizing-wrt-labels": "include",
          "text-wrap": "wrap",
          "font-size": 10,
          shape: "round-rectangle",
          width: 200,
          height: 35*label_list.length,
        },
      },
      {
        selector: ":parent",
        style: {
          "background-opacity": 0.25,
          content: "",
          padding: "25px",
        },
      },
      {
        selector: "node.cy-expand-collapse-collapsed-node",
        style: {
          shape: "ellipse",
          "background-opacity": 0.5,
          "font-size": 20,
          width: 100,
          height: 75,
        },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "data(colour)",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "data(colour)",
        },
      },
      {
        selector: "edge.meta",
        style: {
          width: 2,
          "line-color": "#000000",
        },
      },
      {
        selector: ":selected",
        style: {
          "overlay-color": "#999999",
          "overlay-opacity": 0.3,
        },
      },
    ],

    elements: nodes.concat(edges),
  });
  //Base graph rendered

  //Grouping of nodes
  let gcount = 0;
  cy.edges().forEach((e) => {
    if (!(e.source().data("parent") && e.target().data("parent"))) {
      if (e.source().data("colour") == e.target().data("colour")) {
        if (e.source().data("parent")) {
          e.target().move({ parent: e.source().data("parent") });
        } else if (e.target().data("parent")) {
          e.source().move({ parent: e.target().data("parent") });
        } else {
          gcount = gcount + 1;
          cy.add({
            data: {
              id: "g" + gcount,
              label: "group" + gcount,
              colour: e.target().data("colour"),
            },
            group: "nodes",
          });
          e.target().move({ parent: "g" + gcount });
          e.source().move({ parent: "g" + gcount });
        }
      } else {
        if (!e.target().data("parent")) {
          gcount = gcount + 1;
          cy.add({
            data: {
              id: "g" + gcount,
              label: "group" + gcount,
              colour: e.target().data("colour"),
            },
            group: "nodes",
          });
          e.target().move({ parent: "g" + gcount });
        }
        if (!e.source().data("parent")) {
          gcount = gcount + 1;
          cy.add({
            data: {
              id: "g" + gcount,
              label: "group" + gcount,
              colour: e.source().data("colour"),
            },
            group: "nodes",
          });
          e.source().move({ parent: "g" + gcount });
        }
      }
    }
  });

  //Removing parents of single nodes
  cy.nodes(":parent")
    .filter((n) => n.children().length < 2)
    .map((ele) => {
      ele.children().move({ parent: null });
      ele.remove();
    });

  //Setting group attributes
  cy.nodes(":parent").forEach((p) => {
    p.children().forEach((n) => {
      if (
        n.outgoers().filter((ele) => ele.isNode() && ele.parent() != p).length >
        0
      ) {
        exit_attr.forEach(a=>{
          if(p.data(a))
          {
            p.data(a,"undefined")
          }
          else
          {
            p.data(a,n.data(a))
          }
        })
      }
      if (
        n.incomers().filter((ele) => ele.isNode() && ele.parent() != p).length >
        0
      ) {
        entry_attr.forEach(a=>{
          if(p.data(a))
          {
            p.data(a,"undefined")
          }
          else
          {
            p.data(a,n.data(a))
          }
        })
      }
    });
  });

  //Backfix function
  function backFix() {
    cy.edges().forEach((e) => {
      if (e.sourceEndpoint().y > e.targetEndpoint().y) {
        if (
          e.source().incomers().length == 2 &&
          e.source().incomers()[1].outgoers().length == 2
        ) {
          e.source().position("x", e.source().incomers()[1].position().x);
        }
        e.style("curve-style", "unbundled-bezier");
        e.style("control-point-distances", (e) =>
          e.sourceEndpoint().x > e.targetEndpoint().x ? "-250" : "250"
        );
      } else {
        e.style("curve-style", "straight");
      }
    });
  }

  const layout_data = {
    name: "dagre",
    nodeSep: 200,
    rankSep: 30,
    animate: true,
    animationDuration: 400,
    fit: false,
    ranker: "tight-tree",
    stop: function () {
      backFix();
      cy.$(":selected").unselect();
    },
  };

  const layout = cy.layout(layout_data);

  //Expand Collapse
  var api = cy.expandCollapse({
    layoutBy: layout_data,
    fisheye: true,
    animate: true,
    undoable: false,
    expandCueImage: "./assets/icon-plus.png",
    collapseCueImage: "./assets/icon-minus.png",
    expandCollapseCueSize: 20,
    animationDuration: 300,
  });

  //Navigator
  cy.navigator({
    container: document.getElementById("cy"),
  });

  api.expandAll();

  //Event listeners
  var text1 = document.getElementById("node_data1");
  var dropdown1 = document.getElementById("data_option1");
  var text2 = document.getElementById("node_data2");
  var dropdown2 = document.getElementById("data_option2");

  //Expand and Collapse all

  document.getElementById("collapse").addEventListener("click", () => {
    api.collapseAll();
    text1.innerHTML = "";
    text2.innerHTML = "";
    setTimeout(function () {
      cy.fit();
    }, 800);
  });

  document.getElementById("expand").addEventListener("click", () => {
    api.expandAll();
    setTimeout(function () {
      cy.fit();
    }, 900);
  });

  //Zoom

  document.getElementById("zoom_in").addEventListener("click", () => {
    cy.zoom({
      level: cy.zoom() * 2,
      renderedPosition: {
        x: (window.innerWidth * 0.6) / 2,
        y: window.innerHeight / 2,
      },
    });
  });

  document.getElementById("zoom_out").addEventListener("click", () => {
    cy.zoom({
      level: cy.zoom() * 0.5,
      renderedPosition: {
        x: (window.innerWidth * 0.6) / 2,
        y: window.innerHeight / 2,
      },
    });
  });

  document.getElementById("fit").addEventListener("click", () => {
    cy.fit();
  });

  var parameter1 = dropdown1.value;
  var selected = cy;
  var parameter2 = dropdown2.value;

  //Show attributes

  cy.on("tap", (event) => {
    text1.innerHTML = event.target.data(parameter1)
      ? event.target.data(parameter1)
      : "";
    selected = event.target;
    text2.innerHTML = event.target.data(parameter2)
      ? event.target.data(parameter2)
      : "";
  });

  dropdown1.addEventListener("change", (event) => {
    parameter1 = event.target.value;
    text1.innerHTML = selected.data(parameter1)
      ? selected.data(parameter1)
      : "";
  });

  dropdown2.addEventListener("change", (event) => {
    parameter2 = event.target.value;
    text2.innerHTML = selected.data(parameter2)
      ? selected.data(parameter2)
      : "";
  });

  //Grouping

  document.getElementById("group").addEventListener("click", () => {
    const members = cy.nodes(":selected");
    if (members.length == 0) return;
    const oldparent = members[0].data("parent");
    let valid = true;
    let data={
      id: "g" + (gcount+1),
      label: "group" + (gcount+1),
      colour: members[0].data("colour"),
      parent: oldparent
    }
    members.forEach((n) => {
      if (n.data("parent") != oldparent) {
        if (valid) alert("Cannot make group");
        valid = false;
        return;
      }
      if (
        n.outgoers().filter((ele) => ele.isNode() && !ele.selected()).length > 0
      ) {
        exit_attr.forEach(a=>{
          if(data[a])
          {
            data[a]="undefined"
          }
          else
          {
            data[a]=n.data(a)
          }
        })
      }
      if (
        n.incomers().filter((ele) => ele.isNode() && !ele.selected()).length > 0
      ) {
        entry_attr.forEach(a=>{
          if(data[a])
          {
            data[a]="undefined"
          }
          else
          {
            data[a]=n.data(a)
          }
        })
      }
    });
    if (!valid) return;
    gcount = gcount + 1;
    cy.add({
      data: data,
      group: "nodes",
    });
    members.move({ parent: "g" + gcount });
    layout.run();
  });

  document.getElementById("ungroup").addEventListener("click", () => {
    const members = cy.nodes(":selected");
    if (!members.length) {
      return;
    }
    members.forEach((p) => {
      if (p.children().length) {
        p.children().move({
          parent: p.data("parent") ? p.parent().data("id") : null,
        });
        p.remove();
      }
    });
    layout.run();
  });

  //Search

  const search=()=>{
    cy.nodes().style("border-width",0)
    const searching=document.getElementById("search_bar").value
    let found=false
    cy.nodes().forEach(n=>{
      if((n.data(parameter1))&&(n.data(parameter1).includes(searching)))
      {
        found=true
        n.style("border-opacity",1)
        n.style("border-color","yellow")
        n.style("border-width",10)
      }
    })
    if(!found)
      {
        alert("Not found")
      }
  }

  document.getElementById("search_button").addEventListener("click", ()=>{
    search()
  })

  document.getElementById("search_bar").addEventListener("keydown",e=>{
    if(e.code==="Enter")
    {
      search()
    }
  })

  document.getElementById("clear").addEventListener("click",()=>{
    cy.nodes().style("border-width",0)
    document.getElementById("search_bar").value=""
  })
  
}