var raw={};

document.getElementById('input_file')
            .addEventListener('change', function() {
              
            var fr=new FileReader();
            fr.onload=function(){
                raw=JSON.parse(fr.result);
                start();
            }
            
            if(this.files[0].type!="application/json")
            alert("Please enter JSON file")
            else
            fr.readAsText(this.files[0]);
        })


function start()
{
//Converting data
let nodes=raw.objects.map(node=>({"data":{"id":"n"+node._gvid, "colour":node.matching?"#00ff00":"#ff0000","label":"SOURCE:\n"+node.src+"\n\nTARGET:\n"+node.tgt, "equality_set":node.equality_set, "src_stronglylive_set":node.src_stronglylive_set, "src_pointsTo_set":node.src_pointsTo_set, "tgt_stronglylive_set":node.tgt_stronglylive_set, "tgt_pointsTo_set":node.tgt_pointsTo_set},"group":"nodes"}))
let edges=raw.edges.map(edge=>({"data":{"id":"e"+edge._gvid, "source":"n"+edge.tail, "target":"n"+edge.head, "colour":edge.color},"group":"edges"}))

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
          "text-valign":"center",
          "content": "data(label)",
          "compound-sizing-wrt-labels":"include",
          "text-wrap":"wrap",
          "font-size":10,
          "shape":"round-rectangle",
          "width":200,
          "height":65,
        }
      },
      {
        selector: ":parent",
        style: {
          "background-opacity": 0.25,
          "content":"",
          "padding": "25px",
          "border-color": "#000000",
        }
      },
      {
        selector: "node.cy-expand-collapse-collapsed-node",
        style: {
          "shape": "ellipse",
          "background-opacity": 0.5,
          "font-size":20,
          "width":100,
          "height":75
        }
      },
      {
        selector: "edge",
        style: {
          "width": 2,
          "line-color": "data(colour)",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "data(colour)"
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
//Base graph rendered

//Grouping of nodes
let gcount=0
cy.edges().forEach(e => {
  if(!(e.source().data("parent")&&e.target().data("parent")))
  {
	if(e.source().data("colour")==e.target().data("colour"))
	{
    if(e.source().data("parent"))
    {
		  e.target().move({parent: e.source().data("parent")})
    }
    else if(e.target().data("parent"))
    {
      e.source().move({parent: e.target().data("parent")})
    }
    else
    {
      gcount=gcount+1
		  cy.add({"data":{"id":"g"+gcount,"label":"group"+gcount, "colour":e.target().data("colour")}, "group":"nodes"})
		  e.target().move({parent:"g"+gcount})
      e.source().move({parent:"g"+gcount})
    }
	}
	else
	{
    if(!e.target().data("parent"))
    {
		  gcount=gcount+1
		  cy.add({"data":{"id":"g"+gcount,"label":"group"+gcount, "colour":e.target().data("colour")}, "group":"nodes"})
		  e.target().move({parent:"g"+gcount})
    }
    if(!e.source().data("parent"))
    {
      gcount=gcount+1
		  cy.add({"data":{"id":"g"+gcount,"label":"group"+gcount, "colour":e.source().data("colour")}, "group":"nodes"})
		  e.source().move({parent:"g"+gcount})
    }
	}
}
})

//Removing parents of single nodes
cy.nodes(":parent").filter(n=>(n.children().length<2)).map(ele=>{
  ele.children().move({parent:null})
  ele.remove()
})

//Setting group attributes
cy.nodes(":parent").forEach(
  p=>{
    var eqs,sp2,tp2,ssl,tsl
    p.children().forEach(
      n=>{
        if(n.outgoers().filter(ele=>((ele.isNode())&&(ele.parent()!=p))).length>0)
        {
          if(sp2)
          {
            sp2="undefined"
            tp2="undefined"
          }
          else
          {
            sp2=n.data("src_pointsTo_set")
            tp2=n.data("tgt_pointsTo_set")
          }
        }
        if(n.incomers().filter(ele=>((ele.isNode())&&(ele.parent()!=p))).length>0)
        {
          if(eqs)
          {
            eqs="undefined"
            ssl="undefined"
            tsl="undefined"
          }
          else
          {
            eqs=n.data("equality_set")
            ssl=n.data("src_stronglylive_set")
            tsl=n.data("tgt_stronglylive_set")
          }
        }
      }
    )
    p.data("src_pointsTo_set", sp2)
    p.data("tgt_pointsTo_set", tp2)
    p.data("equality_set", eqs)
    p.data("src_stronglylive_set", ssl)
    p.data("tgt_stronglylive_set", tsl)
  }
)

//Backfix function
function backFix(){
  cy.edges().forEach(e=>{
    if(e.sourceEndpoint().y>e.targetEndpoint().y)
      {
        if((e.source().incomers().length==2)&&(e.source().incomers()[1].outgoers().length==2))
        {
          e.source().position("x", e.source().incomers()[1].position().x)
        }
        e.style("curve-style","unbundled-bezier")
        e.style("control-point-distances",e=>(e.sourceEndpoint().x>e.targetEndpoint().x?"-250":"250"))
      }
      else
      {
        e.style("curve-style","straight")
      }
  })
}

//Expand Collapse
  var api = cy.expandCollapse({
    layoutBy: {
      name:"dagre",
      nodeSep: 200,
      rankSep: 30,
      animate: true,
      animationDuration: 400,
      fit: false,
      ranker:"tight-tree",
      stop: function(){backFix()}
    },
    fisheye: true,
    animate: true,
    undoable: false,
    expandCueImage: "./assets/icon-plus.png",
    collapseCueImage: "./assets/icon-minus.png",
    expandCollapseCueSize: 20,
    animationDuration:300,
  });

  //Navigator
  cy.navigator({
    container: document.getElementById("cy")
  });

  api.expandAll()

//Event listeners
  var text1=document.getElementById("node_data1")
  var dropdown1=document.getElementById("data_option1")
  var text2=document.getElementById("node_data2")
  var dropdown2=document.getElementById("data_option2")

  document.getElementById("collapse").addEventListener("click", () => {
    api.collapseAll()
    text1.innerHTML=""
    text2.innerHTML=""
    setTimeout(function(){cy.fit()}, 800)
  });

  document.getElementById("expand").addEventListener("click", () => {
    api.expandAll()
    setTimeout(function(){cy.fit()}, 900)
  });

  document.getElementById("zoom_in").addEventListener("click", ()=>{
    cy.zoom({level: cy.zoom()*2, renderedPosition:{x:(window.innerWidth*0.6/2), y:(window.innerHeight/2)}})
  })

  document.getElementById("zoom_out").addEventListener("click", ()=>{
    cy.zoom({level: cy.zoom()*0.5, renderedPosition:{x:(window.innerWidth*0.6/2), y:(window.innerHeight/2)}})
  })

  document.getElementById("fit").addEventListener("click",()=>{
    cy.fit()
  })

  var parameter1=dropdown1.value
  var selected1={}
  var parameter2=dropdown2.value
  var selected2={}


  cy.on('tap', event=>{
    text1.innerHTML=event.target.data(parameter1)?event.target.data(parameter1):""
    selected1=event.target
    text2.innerHTML=event.target.data(parameter2)?event.target.data(parameter2):""
    selected2=event.target
  });
  
  dropdown1.addEventListener("change",event=>{
    parameter1=event.target.value
    text1.innerHTML=selected1.data(parameter1)?selected1.data(parameter1):""
  });

  dropdown2.addEventListener("change",event=>{
    parameter2=event.target.value
    text2.innerHTML=selected2.data(parameter2)?selected2.data(parameter2):""
  });

  document.getElementById("group").addEventListener("click", ()=>{
    const members=cy.nodes(":selected")
    var eqs,sp2,tp2,ssl,tsl
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
      if(n.outgoers().filter(ele=>(ele.isNode()&&!(ele.selected()))).length>0)
      {
        if(sp2)
          {
            sp2="undefined"
            tp2="undefined"
          }
          else
          {
            sp2=n.data("src_pointsTo_set")
            tp2=n.data("tgt_pointsTo_set")
          }
      }
      if(n.incomers().filter(ele=>(ele.isNode()&&!(ele.selected()))).length>0)
      {
        if(eqs)
          {
            eqs="undefined"
            ssl="undefined"
            tsl="undefined"
          }
          else
          {
            eqs=n.data("equality_set")
            ssl=n.data("src_stronglylive_set")
            tsl=n.data("tgt_stronglylive_set")
          }
      }
    });
    if(!valid)
    return
    gcount=gcount+1
    cy.add({"data":{"id":"g"+gcount,"label":"group"+gcount, "colour":members[0].data("colour"), "parent":oldparent, "equality_set":eqs, "src_stronglylive_set":ssl, "src_pointsTo_set":sp2, "tgt_stronglylive_set":tsl, "tgt_pointsTo_set":tp2 }, "group":"nodes"})
    members.move({parent:"g"+gcount})
  });
}
