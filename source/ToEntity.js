const fs = require('fs');


///首字母大写
function toFirstUpperCase(letter){
	let letterOne = letter.charAt(0).toUpperCase()
	//return letter.replace(/./, letterOne)
	return letter.replace(/./, letterOne).replace(/_([a-z,A-Z])/g,($0,$1)=>{
		return $1.toUpperCase()
	})
}

///转成Java SpringBoot实体
function toJava(tableName, schemas, config,model) {
	let className = toFirstUpperCase(tableName)///实体名称
	if(config.datbase) tableName = config.datbase + '.' + tableName
	let varTypes = {
		Int:'Integer',
		Long:'Long',
		String:'String',
		Double:'Double'
	}
	let prototypes = '', functions = '',stringify = ''
	for (let k in schemas) {
		let p = schemas[k],K = toFirstUpperCase(k), varType = /* p.varType || */varTypes.String
		switch (k) {
	// 		case '_id':
	// 			varType = varTypes.Long
	// 			p.label = p.label || '自增_id'
	// 			prototypes += `
    // /**
    //  * 自增_id
    //  */
    // @ApiModelProperty("${p.label}")
    // private ${varType} _id;
    //       `
	// 			break;
			case 'id':
				varType = varTypes.Long
				if(p.data_type && /VARCHAR/i.test(p.data_type)) varType = varTypes.String
				p.label = p.label || '编码'
				prototypes += `
	/**
	 * ${p.label}
	 */
	@TableId(type = IdType.ASSIGN_ID)
	@ApiModelProperty("${p.label}")
	@JsonSerialize(using = ToStringSerializer.class)
	private ${varType} id;
			`
				break;
			case 'state':
				varType = varTypes.Int
				p.label = p.label || '逻辑删除控制'
				prototypes += `
	/**
	 * ${p.label}
	 */
	@ApiModelProperty("${p.label}")
	@TableLogic
	private ${varType} state;
			  `
				break;
			case 'createTime':
				varType = varTypes.Long
				p.label = p.label || '创建时间'
				prototypes += `
	/**
	 * ${p.label}
	 */
	@TableField(fill = FieldFill.INSERT)
	@ApiModelProperty("${p.label}")
	@JsonSerialize(using = ToStringSerializer.class)
	private ${varType} createTime;
				  `
				break;
			case 'createTimeString':
				varType = varTypes.String
				p.label = p.label || '创建时间字符串'
				prototypes += `
	/**
	 * ${p.label}
	 */
	@TableField(fill = FieldFill.INSERT)
	@ApiModelProperty("${p.label}")
	private ${varType} createTimeString;
					`
				break;
			case 'updateTime':
				varType = varTypes.Long
				p.label = p.label || '上次更新时间'
				prototypes += `
	/**
	 * ${p.label}
	 */
	@TableField(fill = FieldFill.UPDATE)
	@ApiModelProperty("${p.label}")
	@JsonSerialize(using = ToStringSerializer.class)
	private ${varType} updateTime;
					`
				break;
			case 'updateTimeString':
				varType = varTypes.String
				p.label = p.label || '更新时间字符串'
				prototypes += `
	/**
	 * ${p.label}
	 */
	@TableField(fill = FieldFill.UPDATE)
	@ApiModelProperty("${p.label}")
	private ${varType} updateTimeString;
					`
				break;
			case 'unitId':
				varType = varTypes.String
				p.label = p.label || '单位'
				prototypes += `
	/**
	 * ${p.label}
	 */
	@TableField(fill = FieldFill.INSERT)
	@ApiModelProperty("${p.label}")
	private ${varType} unitId;
					`
				break;
			default:
				p.label = p.label || k || ''
				if (!p.varType) {
					p.rule = p.rule || {}
					varType = p.rule.PositiveNum ? varTypes.Double : (p.rule.PositiveInt ? varTypes.Int : varType);
					if(/sort|level/.test(k)
					  || p.type == 'switch' 
					  || (p.attr && p.attr.type == 'number') || (p.data_type && /int/i.test(p.data_type))){
						varType = varTypes.Int
					}else if(p.type == 'datetime' || (p.data_type && /bigint/i.test(p.data_type))){
						varType = varTypes.Long
					}
				  }
				prototypes += `
    /**
     * ${p.label}
	 * ${p.desc || ''}
     */
    @ApiModelProperty("${p.label}")
    private ${varType} ${k};
				`
				break;
		}
		if(k != 'unitId') stringify += `\\"${k}\\":\\"" + this.get${K}() + "\\",`
		functions += `
	/**
	 * 设置${p.label}
	 */
	public void set${K}(${varType} ${k}){
		this.${k} = ${k};
	}

	/**
	 * 获取${p.label}
	 */
	public ${varType} get${K}(){
		return this.${k};
	}
		`
	}
	let doc = `
package ${config.id}.entity;

import java.io.Serializable;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

/**
 * 
 * @TableName ${tableName}
 * @description ${model.nickName} ${model.desc}
 */
@Data
@TableName("${tableName}")
@ApiModel
public class ${className} implements Serializable {
    ${prototypes}
	${functions}
	public String stringify(){
		String rc = "{${stringify}\\"unitId\\":\\"" + this.getUnitId() + "\\"}";
		rc = rc.replaceAll("\\"null\\"","null").replaceAll("\\"([0-9]+)\\"","$1");
        return rc;
	}

	public static ${className} JSONparse(String jsonString) throws JsonProcessingException {
        if(jsonString == null) return null;
		try {
            ObjectMapper objectMapper = new ObjectMapper();
            return objectMapper.readValue(jsonString,${className}.class);
        }catch (JsonProcessingException e){
            return null;
        }
    }
}
    `
	if(!fs.existsSync('./java')) fs.mkdirSync('./java')
	if(!fs.existsSync('./java/entity')) fs.mkdirSync('./java/entity')
	if(!fs.existsSync('./java/mapper')) fs.mkdirSync('./java/mapper')
	if(!fs.existsSync('./java/service')) fs.mkdirSync('./java/service')
	if(!fs.existsSync('./java/service/impl')) fs.mkdirSync('./java/service/impl')
	fs.writeFileSync(`./java/entity/${className}.java`, doc)
	fs.writeFileSync(`./java/mapper/${className}Mapper.java`, `
package ${config.id}.mapper;
import ${config.id}.entity.${className};
import org.springframework.stereotype.Repository;

import java.util.Date;

@Repository
public interface ${className}Mapper extends CustomerBaseMapper<${className}> {

}
	`)
	fs.writeFileSync(`./java/service/${className}Service.java`, `
package ${config.id}.service;

import com.baomidou.mybatisplus.extension.service.IService;
import ${config.id}.Interceptor.ResultData;
import ${config.id}.entity.${className};
import ${config.id}.mapper.${className}Mapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.Serializable;

/**
* @author --
* @description 针对表【${tableName}】的数据库操作Service
* @createDate ${new Date().toLocaleString()}
*/
public interface ${className}Service extends IService<${className}> {

}	
	`)
	fs.writeFileSync(`./java/service/impl/${className}ServiceImpl.java`, `
package ${config.id}.service.impl;

import com.baomidou.mybatisplus.extension.service.IService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import ${config.id}.entity.${className};
import ${config.id}.service.${className}Service;
import ${config.id}.mapper.${className}Mapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
* @author --
* @description 针对表【${tableName}】的数据库操作Service实现
* @createDate ${new Date().toLocaleString()}
*/
@Service
public class ${className}ServiceImpl extends ServiceImpl<${className}Mapper, ${className}>
implements ${className}Service{

}
	
	`)
}


///转成Flutter Dart实体
function toDart(tableName, schemas, config,model) {
	let className = toFirstUpperCase(tableName)///实体名称
	if(config.datbase) tableName = config.datbase + '.' + tableName
	let varTypes = {
		Int:'int',
		Long:'BigInt',
		String:'String',
		Double:'double'
	}
	let prototypes = '', functions = '',stringify = ''
	for (let k in schemas) {
		let p = schemas[k],K = toFirstUpperCase(k), varType = /* p.varType || */varTypes.String
		switch (k) {
	// 		case '_id':
	// 			varType = varTypes.Long
	// 			p.label = p.label || '主键'
	// 			prototypes += `
    // ///主键
    // ${varType} _id;
    //       `
	// 			break;
			case 'id':
				varType = varTypes.Long
				if(p.data_type && /VARCHAR/i.test(p.data_type)) varType = varTypes.String
				p.label = p.label || '编码'
				prototypes += `
	///${p.label}
	${varType} id;
			`
				break;
			case 'state':
				varType = varTypes.Int
				p.label = p.label || '逻辑删除控制'
				prototypes += `
	///${p.label}
	${varType} state;
			  `
				break;
			case 'createTime':
				varType = varTypes.Long
				p.label = p.label || '创建时间'
				prototypes += `
	///${p.label}
	${varType} createTime;
				  `
				break;
			case 'updateTime':
				varType = varTypes.Long
				p.label = p.label || '上次更新时间'
				prototypes += `
	///${p.label}
	${varType} updateTime;
					`
				break;
			case 'unitId':
				varType = varTypes.String
				p.label = p.label || '单位'
				prototypes += `
	///${p.label}
	${varType} unitId;
					`
				break;
			default:
				p.label = p.label || k || ''
				if (!p.varType) {
					p.rule = p.rule || {}
					varType = p.rule.PositiveNum ? varTypes.Double : (p.rule.PositiveInt ? varTypes.Int : varType);
					if(/sort|level/.test(k)
					  || p.type == 'switch' 
					  || (p.attr && p.attr.type == 'number') || (p.data_type && /int/i.test(p.data_type))){
						varType = varTypes.Int
					}else if(p.type == 'datetime' || (p.data_type && /bigint/i.test(p.data_type))){
						varType = varTypes.Long
					}
				  }
				prototypes += `
  ///${p.label} ${p.desc || ''}
  ${varType} ${k};
				`
				break;
		}
		if(varType == 'int'){
			functions += `
		${k} = int.parse(map['${k}'].toString());`
		}else if(varType == 'double'){
			functions += `
		${k} = double.parse(map['${k}'].toString());`
		}else if(varType == 'BigInt'){
			functions += `
		${k} = BigInt.parse(map['${k}'].toString());`
		}else{
			functions += `
		${k} = map['${k}'];`
		}
	}
	let doc = `
class ${className}{
	${prototypes}
	${className}(Map map){
		if(map == null) return;
		${functions}
	}
}
    `
	if(!fs.existsSync('./dart')) fs.mkdirSync('./dart')
	fs.writeFileSync(`./dart/${className}.dart`, doc)
}

module.exports = { toJava, toDart }