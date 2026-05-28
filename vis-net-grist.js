////////////////////////////////////////////////////////////////////////////////
// Variables
const status_div = document.querySelector("#status");
status_div.style.whiteSpace = "pre-line"; // Force honoring \n somehow.
const dropdown_table_src = document.getElementById('dropdown_table_src');
const dropdown_nodes   = document.getElementById('dropdown_nodes');
const dropdown_refs  = document.getElementById('dropdown_refs');

const button_choose  = document.getElementById('button_choose');
const button_update  = document.getElementById('button_update');
const button_modify  = document.getElementById('button_modify');

let current_table_src= '';
let current_nodes_col  = '';
let current_ref_col = '';
let current_idx  = null;
let cfg_table_id;
let rawNodes;
let rawEdges;

//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// Widget execution
initialize_widget();
grist.ready({ 
  requiredAccess: 'full',
  columns: [
        { name: "table_source",  title: "table_source", type: "Text" },
        { name: "nodes_column",  title: "nodes_column", type: "Text"},
        { name: "ref_column",    title: "ref_column", type: "Text"},
      ]
});

grist.onRecord(record => { 
  current_table_src = record.table_source;
  current_nodes_col   = record.nodes_column;
  current_ref_col   = record.ref_column;
  current_idx   = record.id;
  update_ui();
});
//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// initialize 
async function initialize_widget() {
  cfg_table_id = await grist.selectedTable.getTableId();
  
  await init_dropdown_table_src();
  disp_status('dropdown_table updated.');
  
  await init_dropdown_nodes_col();
  disp_status('dropdown_col updated.');
  
  await init_dropdown_ref_column(); 
  disp_status('dropdown_ref updated.');
  
  await init_button_choose(); 
  disp_status('button_choose updated.')
  
  await init_button_update(); 
  disp_status('button_update updated.');
  
  await init_button_modify(); 
  disp_status('button_test updated.');

  await update_ui();
  disp_status('Ready.');
};
//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// update_ui
async function update_ui() {
  cfg_table= await grist.docApi.fetchTable(cfg_table_id);
  n_rows = cfg_table.id.length;
  button_choose.textContent ='Choose';

  // We check if we can add a new set of nodes
  if ((current_table_src!='')&&(current_nodes_col!='')&&(current_ref_col=='')){
    button_choose.textContent ='Add';
  }
  
  // We check if we can add a new set of edges
  if ((current_table_src!='')&&(current_nodes_col!='')&&(current_ref_col!='')){
    button_choose.textContent ='Add';
  }

  // Look for the currently selected record. If found we can have the option to remove it.
  for(let i=0; i<=n_rows;i++) {
     if ((cfg_table.table_source[i]==current_table_src)&&
        (cfg_table.nodes_column[i]==current_nodes_col)&&
        (cfg_table.ref_column[i]==current_ref_col)) {
          current_idx= cfg_table.id[i];
          await grist.setCursorPos({ rowId: current_idx });
          button_choose.textContent='Remove';
          break;
        }
  }
  
  dropdown_table_src.value = current_table_src;  
  await update_dropdown_nodes();  
  dropdown_nodes.value = current_nodes_col; 
  dropdown_refs.value = current_ref_col;

};
//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// get_type_from_col_ref
async function get_type_from_col_ref(table_source, col_ref) {
  table_ref=''
  const all_tables = await grist.docApi.fetchTable('_grist_Tables');
  const all_cols = await grist.docApi.fetchTable('_grist_Tables_column');
  table_idx = all_tables.tableId.indexOf(table_source);
  table_source_id = all_tables.id[table_idx]

  const num_rows = all_cols.id.length;
    for (let i=0; i<=num_rows; i++) {
      parentId = all_cols.parentId[i]
      if (all_cols.parentId[i] !== table_source_id) {
        continue;
      }
      if (all_cols.colId[i]!==col_ref){
        continue
      }
      type = all_cols.type[i];
    } 
  return type
}
//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// init/updater nodes and egdes column dropdown
async function date_dropdown_nodes() {
  // update the list of choices for dropdown_nodes, based on current_table_src
  // disp_status(= `Selected new table ${current_table_src}`;)
    
  // get list of columns, with type
  const all_tables = await grist.docApi.fetchTable('_grist_Tables');
  const all_cols = await grist.docApi.fetchTable('_grist_Tables_column');
  current_table_idx = all_tables.tableId.indexOf(current_table_src);
  current_table_row = all_tables.id[current_table_idx]
  
  const num_rows = all_cols.id.length;
  const cols_text = ['id'];
  const cols_ref = []; 
    
  for (let i=0; i<=num_rows; i++) {
    parentId = all_cols.parentId[i]
    if (all_cols.parentId[i] !== current_table_row) {
      continue;
    }
    col_id = all_cols.colId[i];
    type = all_cols.type[i];
    if (type==='Text') {
      cols_text.push(col_id);
    }
    if (type.startsWith('Ref')) {
      cols_ref.push(col_id);
    }
  } 

  // Update dropdown nodes col
  dropdown_nodes.innerHTML = '';
  cols_text.forEach((item) => {
    if (!(['manualSort'].includes(item) || item.startsWith('grist'))) {
      const option = document.createElement('option');
      option.value=item;
      option.textContent = item;
      dropdown_nodes.appendChild(option);
    }
  });
  
  dropdown_refs.innerHTML = '';
  cols_ref.forEach((item) => {
    if (!(['manualSort'].includes(item) || item.startsWith('grist'))) {
      const option = document.createElement('option');
      option.value=item;
      option.textContent = item;
      dropdown_refs.appendChild(option);
    }
  });
};
//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// init_dropdown_table_src 
async function init_dropdown_table_src() {
  const all_tables = await grist.docApi.fetchTable('_grist_Tables');  
  all_tables_id = all_tables.tableId;
  
  all_tables_id.forEach((item) => {
    const option = document.createElement('option');
    option.value=item;
    option.textContent = item;
    dropdown_table_src.appendChild(option);
  });

  dropdown_table_src.onchange=  async (event) => {
    current_table_src = event.target.value;
    await update_dropdown_nodes();
    current_nodes_col = '';
    current_ref_col = '';
    await update_ui()
  };
};
//-----------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// init column 
async function init_dropdown_nodes_col() {
  dropdown_nodes.onchange = async (event) => {
    current_nodes_col = event.target.value;    
    await update_ui()
  }
}
//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// init refs
async function init_dropdown_ref_column() {
  dropdown_refs.onchange = async (event) => {
    current_ref_col = event.target.value;  
    await update_ui()
  }
}
//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// init button 
async function init_button_choose() {
  button_choose.onclick = async () => {
    reset_status()
    if (button_choose.textContent=='Choose') {
      disp_status('Pick at least a table and a column')
    }
    else if (button_choose.textContent=='Remove') {
      await grist.docApi.applyUserActions([
        [
          "RemoveRecord", 
          cfg_table_id, 
          current_idx
        ]
      ]);
    }
    else if (button_choose.textContent=='Add') {
      await grist.selectedTable.create({
        fields: {
          table_source: current_table_src,
          nodes_column: current_nodes_col,
          ref_column: current_ref_col,
        }
      }) 
    }
    update_ui();
  };
}
//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// init button 
async function init_button_modify() {
  button_modify.onclick = async () => {
    reset_status()
    disp_status(`Modify current_idx: ${current_idx}`)
      await grist.selectedTable.update({
      id: current_idx,        
      fields: {
          table_source: current_table_src,
          nodes_column: current_nodes_col,
          ref_column: current_ref_col,
        }
      })
  }
}
//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// init button_update, creates graphs
async function init_button_update() {
  
  button_update.onclick = async () => {
    reset_status()
    //disp_status('Updating graph.............')
    cfg_table= await grist.docApi.fetchTable(cfg_table_id);
    n_rows = cfg_table.id.length;
    rawNodes = [] 
    rawEdges = []
    const palette = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];
    added_nodes_table = []; // track nodes already added  
    for(let i=0; i<n_rows; i++) {
      const table_id = cfg_table.table_source[i]
      const nodes_col_id = cfg_table.nodes_column[i]
      const ref_col_id = cfg_table.ref_column[i]
      if (!added_nodes_table.includes(table_id)) {

        const node_color = palette[i % palette.length];
        // Add nodes //
        const table = await grist.docApi.fetchTable(table_id);
        const nodes_col = table[nodes_col_id];
       
        for(let j=0; j<table.id.length;j++){
          id = `${table_id}[${table.id[j]}]`          
          if (nodes_col_id === 'id') {
            value = id
          }
          else {
            //value= id+`:${nodes_col[j]}` // useful for debugging links
            value= nodes_col[j]
          }    
          node = {id: id, 
                label: value,
                color: node_color
                }
               
          rawNodes.push(node);
        }
        added_nodes_table.push(table_id)
      }

      if (table_id!=''&&nodes_col_id!==''&&ref_col_id != '') {
        //disp_status('adding edges ++++++++++++++++++++++++++++++++++++++')     
        const table = await grist.docApi.fetchTable(table_id);
        col_refs = table[ref_col_id]  // references in the source table
     
        const type = await get_type_from_col_ref(table_id, ref_col_id)
        type_ref = type.split(':')[0]
        table_ref_id = type.split(':')[1]
        const table_ref = await grist.docApi.fetchTable(table_ref_id);
        
        for(let j=0; j<table.id.length; j++)  {      
          from_node = `${table_id}[${table.id[j]}]`

          if (type_ref === 'RefList') {
            from_refs =  col_refs[j] 
            if (from_refs!==null) {
              from_refs.shift();
            }  
            else {
              from_refs=[]
            }                
          } 
          else
          {
            if (col_refs[j]==null) { // TODO check what happens with empty reference in case of Ref
              from_refs=[]
            }
            else {
              from_refs = [col_refs[j]];
            }
          }
          //disp_status(`from ${from_node} to ${from_refs}`)
          for(k=0; k< from_refs.length; k++){
            to_node = `${table_ref_id}[${from_refs[k]}]`
            //disp_status(`from ${from_node} to ${to_node}`)
            edge = {from: from_node, to: to_node}
            rawEdges.push(edge)         
          }
        }
      } 
    }
    display_graph()
  };
}
//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////
// disp, append and reset status
function disp_status(txt) {
  status_div.textContent = `\n${txt}`;
}
function reset_status() {
  status_div.textContent ='';
}
//------------------------------------------------------------------------------

////////////////////////////////////////////////////////////////////////////////

// display_graph
async function display_graph() {

  const data = {
      nodes: rawNodes,
      edges: rawEdges
    };

  const options = {};
  const container = document.getElementById('network-container');
  const network = new vis.Network(container, data, options);
}
//------------------------------------------------------------------------------