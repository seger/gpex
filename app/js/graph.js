var graph = angular.module('graph', []);


graph.directive('theGraph', ['$compile', function($compile) {

    return {
        restrict: 'A',
        link: function(scope, element, attrs) {


            /* DATA */

            // Retrieve entities.
            var entityData = (function() {
                var json = null;
                $.ajax({
                    'async': false,
                    'global': false,
                    'url': "json/entity.json",
                    'dataType': "json",
                    'success': function(data) {
                        json = data;
                    }
                });
                return json;
            })();

            // Retrieve relationships.
            var relData = (function() {
                var json = null;
                $.ajax({
                    'async': false,
                    'global': false,
                    'url': "json/relationship.json",
                    'dataType': "json",
                    'success': function(data) {
                        json = data;
                    }
                });
                return json;
            })();

            // Retrieve E-R data view.
            var entityRelData = (function() {
                var json = null;
                $.ajax({
                    'async': false,
                    'global': false,
                    'url': "json/entity-rel-view.json",
                    'dataType': "json",
                    'success': function(data) {
                        json = data;
                    }
                });
                return json;
            })();


            // Data to be initially displayed from canned queries.

            var initNodes = {
                "1": [
                    entityData[2],
                    entityData[3]
                ],
                "2": [
                    entityData[4]
                ]
            };

            var initNodeRelData = {
                "1": [
                    entityRelData[2],
                    entityRelData[3]
                ],
                "2": [
                    entityRelData[4]
                ]
            };

            var initLinks = {
                "1": [
                    relData[5]
                ],
                "2": []
            };


            // Max number of sources for a rel.
            var refsMaxLen = 0;
            for (i = 0; i < relData.length; i++) {
                if (relData[i]["refs"].length > refsMaxLen) {
                    refsMaxLen = relData[i]["refs"].length;
                }
            }


            /* CONFIG */

            // D3 force layout parameters.
            var layoutForce = {
                gravity: .02,
                distance: 133,
                charge: -1000,
                friction: 0.8
            }

            // The 'Show only pinned' button.
            var pinCtrlBtnParam = {
                posX: 134,
                posY: 6,
                width: 118,
                height: 40
            }

            // Corner rounding values for node rectangles, by species.
            var nodeRounding = {
                // Use high value to render rect as a circle.
                "Homo sapiens": 20,
                "Mus musculus": 0
            };

            // Node colors, by data type.
            var nodeColors = {
                "disease": "#6db6ff",
                "gene": "#004949",
                "genotype": "#490092",
                "phenotype": "#b66dff",
                "variant": "#ff6db6"
            };

            // Node dimensions.
            var rectWidth = 24,
                rectHeight = 24;

            // Node text relative positioning.
            var textdX = "30",
                textdY = "1.2em";

            // Max text label length.
            var maxLabelLen = 35;

            // Max popup description length.
            var maxDxLen = 500;

            // Min and max edge widths.
            var minEdgeWidth = 4,
                maxEdgeWidth = 12;

            // Color gradient scale for edges: RGB for 1st and 2nd colors.
            var aR = 0,
                aG = 0,
                aB = 0;
            var bR = 168,
                bG = 0,
                bB = 0;

            // Popup width in pixels.
            var popupWidth = {
                narrow: 200,
                wide: 333
            }

            // Popup chart bar will not be lengthened beyond this number of rels.
            var barLenCutoff = 20;


            /* BEGIN D3 CODE */

            /*
                Adapted from:

                "Labeled force layout," by Mike Bostock
                http://bl.ocks.org/mbostock/950642
                Accessed: 2015-08-01

                "Modifying a force layout," by Mike Bostock
                http://bl.ocks.org/mbostock/1095795
                Accessed: 2015-08-01

                "Adding new nodes to force-directed layout," by nkoren
                http://stackoverflow.com/questions/9539294/adding-new-nodes-to-force-directed-layout
                Accessed: 2015-08-01
            */

            function fillInLinks() {
                // After new nodes have been added, add any missing edges
                //   between nodes now being displayed.
                for (i = 0; i < relData.length; i++) {
                    if (nodesShowing.indexOf(relData[i].source) > -1 &&
                        nodesShowing.indexOf(relData[i].target) > -1) {
                        graph.addLink(relData[i]);
                    }
                }
            }

            function dragstart(d) {
                // Pin node.
                nodesPinned.push(d.id);
                d.fixed = true;
                d3.select(this).classed("fixed", true);
            }

            function unfixNode(d) {
                // Unpin node.
                var i = 0;
                while (i < nodesPinned.length) {
                    if (nodesPinned[i] == d.id) delete nodesPinned[i];
                    else i++;
                }
                d.fixed = false;
                d3.select(this).classed("fixed", false);
            }

            function entitySelect(d) {
                // Entity selection on Angular click events.
                return "selPanePath='include/entity.html'; entityId='" + d.id + "'; history.unshift('" + d.name + "')";
            }

            function relSelect(d) {
                // Relationship selection on Angular click events.
                return "selPanePath='include/relationship.html'; relId='" + d.id + "'";
            }

            function removeUnpinned() {
                // Remove unpinned nodes from display.
                for (i = 0; i < nodesShowing.length; i++) {
                    if (nodesPinned.indexOf(nodesShowing[i]) == -1) {
                        graph.removeNode(nodesShowing[i]);
                    }
                }
            }

            // Displayed and pinned node arrays, will include id's only.
            var nodesShowing = [],
                nodesPinned = [];

            function theGraph(el) {

                // Remove all nodes, then display nodes from canned search.
                this.doSearch = function(searchId) {
                    if (nodesShowing.length > 0) {
                        for (i = 0; i < nodesShowing.length; i++) {
                            graph.removeNode(nodesShowing[i]);
                        }
                        // Clear arrays.
                        nodesShowing.length = 0;
                        nodesPinned.length = 0;
                    }
                    for (i = 0; i < initNodes[searchId].length; i++) {
                        graph.addNode(initNodes[searchId][i], initNodeRelData[searchId][i]);
                    }
                    if (initLinks[searchId] != null) {
                        for (i = 0; i < initLinks[searchId].length; i++) {
                            graph.addLink(initLinks[searchId][i]);
                        }
                    }
                }

                // Add node for data item clicked in info panel.
                this.addNodeViaPanel = function(newNodeId) {
                    for (i = 0; i < entityData.length; i++) {
                        if (entityData[i].id == newNodeId) {
                            graph.addNode(entityData[i], entityRelData[i]);
                        }
                    }
                    fillInLinks();
                }

                // Display nodes and links related to selected entity.
                this.expandRelNodes = function(id, dataType) {

                    var nodesToAdd = [];
                    for (i = 0; i < relData.length; i++) {
                        if (id == relData[i].source) nodesToAdd.push(relData[i].target);
                        else if (id == relData[i].target) nodesToAdd.push(relData[i].source);
                    }

                    for (i = 0; i < entityData.length; i++) {
                        if (nodesToAdd.indexOf(entityData[i].id) > -1 &&
                            (dataType == "all" || entityData[i].data_type == dataType)) {
                            graph.addNode(entityData[i], entityRelData[i]);
                        }
                    }

                    fillInLinks();

                }

                // Add and remove graph elements.

                this.addNode = function(entity, entityRel) {
                    var entityName = formatText(entity.name, maxLabelLen);
                    var entityDx = formatText(entity.description, maxDxLen);
                    nodes.push({
                        "id": entity.id,
                        "name": entityName,
                        "species": entity.species,
                        "data_type": entity.data_type,
                        "description": entityDx,
                        "ref": entity.ref,
                        "rels": entityRel.rels,
                        "total_rel": entityRel.total_rel
                    });
                    nodesShowing.push(entity.id);
                    update();
                }

                this.removeNode = function(id) {
                    var i = 0;
                    var n = findNode(id);
                    while (i < links.length) {
                        if ((links[i]['source'] == n) || (links[i]['target'] == n)) links.splice(i, 1);
                        else i++;
                    }
                    var index = findNodeIndex(id);
                    if (index !== undefined) {
                        nodes.splice(index, 1);
                        update();
                    }
                    // Remove from displayed and pinned node arrays.
                    for (i = 0; i < nodesShowing.length; i++) {
                        if (nodesShowing[i] == id) delete nodesShowing[i];
                    }
                    for (i = 0; i < nodesPinned.length; i++) {
                        if (nodesPinned[i] == id) delete nodesPinned[i];
                    }
                }

                this.addLink = function(rel) {
                    var sourceNode = findNode(rel.source);
                    var targetNode = findNode(rel.target);
                    var edgeWeight = calcEdgeWeight(rel.refs);
                    // Determine edge color if user chose this option.
                    if (document.getElementById("heatedEdges").checked) {
                        var edgeColor = calcEdgeColor(rel.refs);
                    } else {
                        var edgeColor = "rgb(0,0,0)";
                    }

                    if ((sourceNode !== undefined) && (targetNode !== undefined)) {
                        links.push({
                            "id": rel.id,
                            "source": sourceNode,
                            "target": targetNode,
                            "weight": edgeWeight,
                            "color": edgeColor
                        });
                        update();
                    }

                }

                var findNode = function(id) {
                    for (var i = 0; i < nodes.length; i++) {
                        if (nodes[i].id === id)
                            return nodes[i];
                    };
                }

                var findNodeIndex = function(id) {
                    for (var i = 0; i < nodes.length; i++) {
                        if (nodes[i].id === id)
                            return i;
                    };
                }

                // Shorten text label or popup description if necessary.
                var formatText = function(s, max) {
                    if (s.length > max) return s.slice(0, max) + "...";
                    else return s;
                }

                // Edge weight varies with number of pubs.
                var calcEdgeWeight = function(refs) {
                    // Normalize to value between 0 and 1.
                    var value = ((refs.length - 1) / (refsMaxLen - 1));
                    return Math.round((maxEdgeWidth - minEdgeWidth) * value + minEdgeWidth);
                }

                // Edge color scale is gradient based on number of pubs.
                var calcEdgeColor = function(refs) {
                    // Normalize to value between 0 and 1.
                    var value = ((refs.length - 1) / (refsMaxLen - 1));
                    // Evaluate.
                    var red = Math.round((bR - aR) * value + aR);
                    var green = Math.round((bG - aG) * value + aG);
                    var blue = Math.round((bB - aB) * value + aB);
                    return "rgb(" + red + "," + green + "," + blue + ")";
                }

                // Set up the visualization.

                // Set dimensions, compensating for an inexact width.
                var w = $(el).innerWidth() + 15,
                    h = $(el).innerHeight();

                var viz = this.viz = d3.select(el).append("svg:svg")
                    .attr("width", w)
                    .attr("height", h);

                var force = d3.layout.force()
                    .gravity(layoutForce.gravity)
                    .distance(layoutForce.distance)
                    .charge(layoutForce.charge)
                    .friction(layoutForce.friction)
                    .size([w, h]);

                var drag = force.drag()
                    .on("dragstart", dragstart);

                var nodes = force.nodes(),
                    links = force.links();

                // The 'Show only selected' button.
                var pinCtrlBtn = viz.append('g')
                pinCtrlBtn.append('foreignObject')
                    .attr('x', pinCtrlBtnParam.posX)
                    .attr('y', pinCtrlBtnParam.posY)
                    .attr('width', pinCtrlBtnParam.width)
                    .attr('height', pinCtrlBtnParam.height)
                    .append("xhtml:body")
                    .html('<button type="button" class="btn btn-default btn-sm ctrl-btn">Show only pinned</button>')
                    .on("click", removeUnpinned)

                // Update the graph.
                var update = function() {

                    // The edges.

                    var link = viz.selectAll("line.link")
                        .data(links, function(d) {
                            return d.source.id + "-" + d.target.id;
                        });

                    link.enter().append("line")
                        .attr("id", "new-link")
                        .attr("class", "link")
                        .attr("ng-click", relSelect)
                        .style("stroke-width", function(d) {
                            return d.weight;
                        })
                        .style("stroke", function(d) {
                            return d.color;
                        });

                    // Insert each line into the DOM before the nodes, so the
                    //   nodes get layered over the lines. Otherwise, because
                    //   the nodes were by necessity created first and because
                    //   D3 does not recognize z-indeces, they would appear
                    //   under the lines, whose ends go to the node center
                    //   points.
                    $('#new-link')
                        .insertAfter("#the-graph svg > g:nth-child(1)")
                        .removeAttr("id");

                    link.exit().remove();

                    // The nodes.

                    var node = viz.selectAll("g.node")
                        .data(nodes, function(d) {
                            return d.id;
                        });

                    var nodeEnter = node.enter().append("g")
                        .attr("class", "node")
                        .attr("ng-click", entitySelect)
                        .attr("ng-right-click", entitySelect)
                        .on("dblclick", unfixNode)
                        .call(force.drag);

                    nodeEnter.append("rect")
                        .attr("class", "popup-enabled")
                        .attr("width", rectWidth)
                        .attr("height", rectHeight)
                        .attr("rx", function(d) {
                            return nodeRounding[d.species];
                        })
                        .attr("ry", function(d) {
                            return nodeRounding[d.species];
                        })
                        .style("fill", function(d) {
                            return nodeColors[d.data_type];
                        });

                    nodeEnter.append("text")
                        .attr("class", "node-text")
                        .attr("dx", textdX)
                        .attr("dy", textdY)
                        .text(function(d) {
                            return d.name;
                        });

                    node.exit().remove();

                    // Right-click contextual popup.

                    /*
                        Adapted from:

                        "Creating a right-click contextual popup with D3," by John Williams
                        https://www.safaribooksonline.com/blog/2014/03/10/creating-right-click-contextual-popup-d3/
                        Accessed: 2015-08-01
                    */

                    var contextMenuShowing = false;

                    d3.select("svg").on('contextmenu', function(d, i) {

                        if (contextMenuShowing) {
                            d3.event.preventDefault();
                            d3.select(".popup").remove();
                            contextMenuShowing = false;

                        } else {
                            var d3_target = d3.select(d3.event.target);

                            // Only nodes have popup menus.
                            if (d3_target.classed("popup-enabled")) {

                                // Width depends on whether popup contains item
                                //   description.
                                var getPopupWidth = function() {
                                    if (document.getElementById("dxInPopup").checked) {
                                        return popupWidth.wide + "px";
                                    } else {
                                        return popupWidth.narrow + "px";
                                    }
                                }

                                // Chart bar width.
                                var getBarWidth = function(numRels) {
                                    if (document.getElementById("dxInPopup").checked) {
                                        var maxBarWidth = popupWidth.wide - 24;
                                    } else {
                                        var maxBarWidth = popupWidth.narrow - 24;
                                    }
                                    width = maxBarWidth / barLenCutoff * numRels;
                                    if (width > maxBarWidth) width = maxBarWidth;
                                    return width + "px";
                                }

                                function closePopup() {
                                    d3.select(".popup").remove();
                                    contextMenuShowing = false;
                                }

                                // Prevent the browser default dialog box from
                                //   appearing on right-click.
                                d3.event.preventDefault();
                                contextMenuShowing = true;
                                var d = d3_target.datum();

                                // Build the popup.
                                var canvas = d3.select(".canvas");
                                var mousePosition = d3.mouse(canvas.node());

                                var popup = canvas.append("div")
                                    .attr("class", "popup")
                                    .style("left", mousePosition[0] + "px")
                                    .style("top", mousePosition[1] + "px")
                                    .style("width", getPopupWidth);
                                popup.append("a").text("×")
                                    .attr("class", "close")
                                    .on("click", closePopup);

                                // Place description here if user chose this
                                //   option.
                                if (document.getElementById("dxInPopup").checked) {
                                    popup.append("p")
                                        .attr("class", "pop-heading")
                                        .append("tspan")
                                        .text(d.species)
                                        .style("font-style", "italic")
                                        .append("tspan")
                                        .text(" " + d.data_type)
                                        .style("font-style", "normal");
                                    popup.append("p")
                                        .text(d.description + " ")
                                        .append("a")
                                        .attr("href", d.ref)
                                        .attr("target", "_blank")
                                        .text("[Monarch]")
                                        .append("hr");
                                }

                                popup.append("p").text("Related items")
                                    .attr("class", "pop-heading");
                                // Display-all button.
                                popup.append("div")
                                    .style("margin-bottom", "8px")
                                    .append("a")
                                    .attr("href", "javascript:graph.expandRelNodes('" + d.id + "', 'all');")
                                    .append("button")
                                    .attr("type", "button")
                                    .attr("class", "btn btn-default btn-sm ctrl-btn")
                                    .on("click", closePopup)
                                    .text("Display all");

                                // Display the related data types and chart.
                                for (i = 0; i < d.rels.length; i++) {
                                    if (d.rels[i][2].length > 0) {
                                        popup.append("div")
                                            .append("a")
                                            .attr("href", "javascript:graph.expandRelNodes('" + d.id + "', '" + d.rels[i][1] + "');")
                                            .on("click", closePopup)
                                            .text(d.rels[i][0]);
                                        popup.append("div")
                                            .attr("class", "chart-data bar-" + d.rels[i][1])
                                            .style("width", getBarWidth(d.rels[i][2].length))
                                            .text(d.rels[i][2].length);
                                    };
                                };

                                popup.append("div")
                                    .style("margin-top", "20px")
                                    .append("a")
                                    .attr("href", "javascript:graph.removeNode('" + d.id + "');")
                                    .on("click", closePopup)
                                    .append("i")
                                    .attr("class", "pull-right glyphicon glyphicon-trash")
                                    .style("color", "Red");

                                var canvasSize = [
                                    canvas.node().offsetWidth,
                                    canvas.node().offsetHeight
                                ];

                                var popupSize = [
                                    popup.node().offsetWidth,
                                    popup.node().offsetHeight
                                ];

                                if (popupSize[0] + mousePosition[0] > canvasSize[0]) {
                                    popup.style("left", "auto");
                                    popup.style("right", "370px");
                                }

                                if (popupSize[1] + mousePosition[1] > canvasSize[1]) {
                                    popup.style("top", "auto");
                                    popup.style("bottom", "5px");
                                }

                            }

                        }

                    });

                    force.on("tick", function() {
                        link.attr("x1", function(d) {
                                return d.source.x;
                            })
                            .attr("y1", function(d) {
                                return d.source.y;
                            })
                            .attr("x2", function(d) {
                                return d.target.x;
                            })
                            .attr("y2", function(d) {
                                return d.target.y;
                            });

                        node.attr("transform", function(d) {
                            return "translate(" + (d.x - rectWidth / 2) + "," + (d.y - rectHeight / 2) + ")";

                        });
                    });

                    // Restart the force layout and compile.
                    force.start();
                    element.removeAttr("the-graph");
                    $compile(element)(scope);

                }

                update();

            }

            // Create the graph.
            graph = new theGraph("#the-graph");

            /* END D3 CODE */

        }

    };

}]);
